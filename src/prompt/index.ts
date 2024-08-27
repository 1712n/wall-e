import { buildRequestForModelProvider, handleStreamResponse } from '../providers';
import { getApiKeyForModelProvider, ModelName, ModelProvider } from '../utils';
import { documentation, documentationExtraction, generateWorker, analyzeTestFile, testFileBestPractices } from './markdown';

type ModelProviderMap = Record<ModelProvider, { default?: ModelName, models?: ModelName[] }>;

export const MODEL_PROVIDERS: ModelProviderMap = {
	[ModelProvider.Anthropic]: {
		default: ModelName.Claude_3_5_Sonnet_20240620,
		models: [
			ModelName.Claude_3_Opus_20240229,
			ModelName.Claude_3_Sonnet_20240229,
			ModelName.Claude_3_Haiku_20240307,
			ModelName.Claude_3_5_Sonnet_20240620
		]
	},
	[ModelProvider.OpenAI]: {
		default: ModelName.GPT_4o,
		models: [
			ModelName.GPT_4o
		]
	},
	[ModelProvider.GoogleAiStudio]: {
		default: ModelName.Gemini_1_5_Pro_Exp_0801,
		models: [
			ModelName.Gemini_1_5_Pro,
			ModelName.Gemini_1_5_Pro_Exp_0801
		]
	},
	[ModelProvider.Unknown]: {}
};

function getProviderForModel(model: ModelName): ModelProvider {
	const providers = Object.keys(MODEL_PROVIDERS) as ModelProvider[];
	for (const provider of providers) {
		const models = MODEL_PROVIDERS[provider].models;
		if (models?.includes(model)) {
			return provider;
		}
	}

	return ModelProvider.Unknown;
}

export function isValidModel(model: ModelName): boolean {
	return getProviderForModel(model) !== ModelProvider.Unknown;
}

function getDefaultModelForProvider(provider: ModelProvider): ModelName | undefined {
	return MODEL_PROVIDERS[provider].default;
}

const MODEL_PROVIDER_ORDER = [
	ModelProvider.Anthropic,
	ModelProvider.GoogleAiStudio,
	ModelProvider.OpenAI
];

export type PromptMessages = {
	user: string;
	system: string;
};

const buildUserMessage = (testFile: string, doc: string): string =>
	`<test_file>\n\n${testFile}\n\n</test_file>\n\n<documentation_file>\n\n${doc}\n\n</documentation_file>`;

export function buildPromptForDocs(testFile: string): PromptMessages {
	return {
		system: documentationExtraction,
		user: buildUserMessage(testFile, documentation),
	};
}

export function buildPromptForWorkers(testFile: string, relevantDocs: string = documentation): PromptMessages {
	return {
		system: generateWorker,
		user: buildUserMessage(testFile, relevantDocs),
	};
}

export function buildPromptForAnalyzeTestFile(testFile: string): PromptMessages {
	return {
		system: `${analyzeTestFile}\n\n<best_practices>\n\n${testFileBestPractices}\n\n</best_practices>`,
		user: `<test_file>\n\n${testFile}\n\n</test_file>`,
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
