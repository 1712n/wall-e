import {
	buildRequestForModelProvider,
	handleStreamResponse,
	getApiKeyForModelProvider,
	ModelName,
	ModelProvider,
	getProviderForModel,
	getDefaultModelForProvider,
} from '../providers';
import { documentation, documentationExtraction, generateWorker, analyzeSpecFile, specFileBestPractices } from './markdown';

const MODEL_PROVIDER_ORDER = [
	ModelProvider.Anthropic,
	ModelProvider.GoogleAi,
	ModelProvider.OpenAI
];

export type PromptMessages = {
	user: string;
	system: string;
};

const buildUserMessage = (specFile: string, doc: string): string =>
	`<spec_file>\n\n${specFile}\n\n</spec_file>\n\n<documentation_file>\n\n${doc}\n\n</documentation_file>`;

export function buildPromptForDocs(specFile: string): PromptMessages {
	return {
		system: documentationExtraction,
		user: buildUserMessage(specFile, documentation),
	};
}

export function buildPromptForWorkers(specFile: string, relevantDocs: string = documentation): PromptMessages {
	return {
		system: generateWorker,
		user: buildUserMessage(specFile, relevantDocs),
	};
}

export function buildPromptForAnalyzeSpecFile(specFile: string): PromptMessages {
	return {
		system: `${analyzeSpecFile}\n\n<best_practices>\n\n${specFileBestPractices}\n\n</best_practices>`,
		user: `<spec_file>\n\n${specFile}\n\n</spec_file>`,
	};
}

export type SendPromptParams = {
	model: ModelName;
	prompts: PromptMessages;
	temperature: number;
};

export class SendPromptError extends Error {
	constructor(
		message: string,
		public params: SendPromptParams,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export type SendPromptResponse = {
	text: string;
	provider: ModelProvider;
	model?: ModelName;
};

export async function sendPrompt(env: Env, params: SendPromptParams, fallback: boolean): Promise<SendPromptResponse> {
	const accountId = env.CF_ACCOUNT_ID;
	const gatewayId = env.CF_GATEWAY_AI_ID;

	const stream = true;

	const mainProvider = getProviderForModel(params.model);
	const providerRequests = [
		buildRequestForModelProvider(mainProvider, {
			...params,
			apiKey: getApiKeyForModelProvider(mainProvider, env),
			stream,
		}),
	];

	if (fallback) {
		MODEL_PROVIDER_ORDER.forEach((provider) => {
			if (provider !== mainProvider) {
				const defaultModel = getDefaultModelForProvider(provider);
				if (!defaultModel) {
					return;
				}

				const fallbackProvider = buildRequestForModelProvider(provider, {
					...params,
					apiKey: getApiKeyForModelProvider(provider, env),
					model: defaultModel,
					stream,
				});
				providerRequests.push(fallbackProvider);
			}
		});
	}

	const response = await fetch(`https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(providerRequests),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new SendPromptError(`Request failed with status ${response.status}: ${JSON.stringify(text)}`, params);
	}

	if (!response.body) {
		throw new SendPromptError('No response body found.', params);
	}

	const reader = response.body.getReader();
	return handleStreamResponse(reader);
}
