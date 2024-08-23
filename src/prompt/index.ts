import { buildRequestForModelProvider } from '../providers';
import { ModelProvider } from '../utils';
import { documentation, documentationExtraction, generateWorker, analyzeTestFile, testFileBestPractices } from './markdown';

type ModelProviderMap = Record<string, ModelProvider>;

export const MODEL_PROVIDERS: ModelProviderMap = {
	'claude-3-opus-20240229': ModelProvider.Anthropic,
	'claude-3-sonnet-20240229': ModelProvider.Anthropic,
	'claude-3-haiku-20240307': ModelProvider.Anthropic,
	'claude-3-5-sonnet-20240620': ModelProvider.Anthropic,
	'gpt-4o': ModelProvider.OpenAI,
	'gemini-1.5-pro': ModelProvider.GoogleAiStudio,
	'gemini-1.5-pro-exp-0801': ModelProvider.GoogleAiStudio,
};

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
	model: string;
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

export async function sendPrompt(env: Env, params: SendPromptParams): Promise<string> {
	const accountId = env.CF_ACCOUNT_ID;
	const gatewayId = env.CF_GATEWAY_AI_ID;

	const mainModelProvider = MODEL_PROVIDERS[params.model];

	const modelProviderOrder = [
		ModelProvider.Anthropic,
		ModelProvider.GoogleAiStudio,
		ModelProvider.OpenAI
	];

	const modelProviderRequests = [
		{
			provider: mainModelProvider,
			request: buildRequestForModelProvider(mainModelProvider, env, params),
		},
	];

	modelProviderOrder
		.filter((provider) => provider !== mainModelProvider)
		.map((provider) => {
			modelProviderRequests.push({
				provider,
				request: buildRequestForModelProvider(provider, env, params),
			});
		});

	const response = await fetch(`https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(modelProviderRequests),
	});

	if (!response.ok) {
		throw new SendPromptError(`Request failed with status ${response.status}`, params);
	}

	if (!response.body) {
		throw new SendPromptError('No response body found.', params);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let modelResponse = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		modelResponse += decoder.decode(value, { stream: true });
	}

	return modelResponse;
}
