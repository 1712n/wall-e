import {
	buildRequestForModelProvider,
	handleStreamResponse,
	getApiKeyForModelProvider,
	ModelName,
	ModelProvider,
	getProviderForModel,
	getDefaultModelForProvider,
} from '../providers';
import { generateWorkerTs, generateWorkerJs, improveWorker, analyzeSpecFile, specFileBestPractices } from './markdown';

const MODEL_PROVIDER_ORDER = [
	ModelProvider.Anthropic,
	ModelProvider.GoogleAi,
	ModelProvider.OpenAI
];

export type PromptMessages = {
	user: string;
	system: string;
};

const buildUserMessage = ({
	specFile,
	indexFile,
	reviewerFeedback,
}: {
	specFile: string;
	indexFile?: string;
	reviewerFeedback?: string;
}): string => {
	let message = '';

	if (indexFile) {
		message += `<index_file>\n${indexFile}\n</index_file>\n\n`;
	}

	if (reviewerFeedback) {
		message += `<reviewer_feedback>\n${reviewerFeedback}\n</reviewer_feedback>\n\n`;
	}

	message += `<spec_file>\n${specFile}\n</spec_file>\n\n`;

	return message;
};

export function buildPromptForWorkerGeneration(specFile: string, language: 'js' | 'ts' = 'ts'): PromptMessages {
	return {
		system: language === 'js' ? generateWorkerJs : generateWorkerTs,
		user: buildUserMessage({
			specFile,
		}),
	};
}

export function buildPromptForWorkerImprovement(indexFile: string, specFile: string, reviewerFeedback: string): PromptMessages {
	return {
		system: improveWorker,
		user: buildUserMessage({
			specFile,
			indexFile,
			reviewerFeedback,
		}),
	};
}

export function buildPromptForAnalyzeSpecFile(specFile: string): PromptMessages {
	return {
		system: `${analyzeSpecFile}\n\n<best_practices>\n${specFileBestPractices}\n</best_practices>`,
		user: `<spec_file>\n${specFile}\n</spec_file>`,
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
	eventId: string | null;
	model?: ModelName;
	metaData?: any;
};

export async function sendPrompt(
	env: Env,
	params: SendPromptParams,
	fallback: boolean,
	stream: boolean = true,
): Promise<SendPromptResponse> {
	const accountId = env.CF_ACCOUNT_ID;
	const gatewayId = env.CF_GATEWAY_AI_ID;

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

	return handleStreamResponse(response);
}
