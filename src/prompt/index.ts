import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { documentation, documentationExtraction, generateWorker, analyzeTestFile, testFileBestPractices } from './markdown';
import { getModelProvider, ModelProvider } from '../utils';

export const ALLOWED_MODELS = [
	'claude-3-opus-20240229',
	'claude-3-sonnet-20240229',
	'claude-3-haiku-20240307',
	'claude-3-5-sonnet-20240620',
	'gpt-4o',
	'gemini-1.5-pro',
	'gemini-1.5-pro-exp-0801',
];

type PromptMessages = {
	user: string;
	system: string;
};

export function buildPromptForDocs(testFile: string): PromptMessages {
	return {
		system: documentationExtraction,
		user: `<test_file>\n\n${testFile}\n\n</test_file>\n\n<documentation_file>\n${documentation}\n\n</documentation_file>`,
	};
}

export function buildPromptForWorkers(testFile: string, relevantDocs?: string): PromptMessages {
	const documentationFile = relevantDocs ?? documentation;
	return {
		system: generateWorker,
		user: `<test_file>\n\n${testFile}\n\n</test_file>\n\n<documentation_file>\n\n${documentationFile}\n\n</documentation_file>`,
	};
}

export function buildPromptForAnalyzeTestFile(testFile: string): PromptMessages {
	return {
		system: `${analyzeTestFile}\n\n<best_practices>\n\n${testFileBestPractices}</best_practices>`,
		user: `<test_file>\n\n${testFile}\n\n</test_file>`,
	};
}

type SendPromptParams = {
	apiKey: string;
	model: string;
	prompts: PromptMessages;
	temperature: number;
};

async function sendAnthropicPrompt(params: SendPromptParams) {
	const { apiKey, model, prompts, temperature } = params;

	const anthropic = new Anthropic({
		apiKey: apiKey,
	});

	const stream = anthropic.messages
		.stream(
			{
				model,
				max_tokens: 8_192,
				system: prompts.system,
				messages: [{ role: 'user', content: prompts.user }],
				temperature,
			},
			{
				headers: {
					'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
				},
			},
		)
		.on('error', (error) => {
			throw new SendPromptError(error.message, params);
		});

	const { content } = await stream.finalMessage();
	if (content.length > 0 && 'type' in content[0] && content[0].type === 'text') {
		return content[0].text;
	}

	throw new SendPromptError('Unexpected response format.', params);
}

async function sendOpenAIPrompt(params: SendPromptParams) {
	const { apiKey, model, prompts, temperature } = params;

	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: 'system', content: prompts.system },
				{ role: 'user', content: prompts.user },
			],
			max_tokens: 4_096,
			temperature,
			seed: 0,
		}),
	}).catch((error) => {
		throw new SendPromptError(error.message, params);
	});

	const data: any = await response.json();
	if (data.error) {
		throw new SendPromptError(data.error.message, params);
	}

	return data.choices[0].message.content;
}

async function sendGeminiPrompt(params: SendPromptParams): Promise<string> {
	const { apiKey, model, prompts, temperature } = params;

	const genAI = new GoogleGenerativeAI(apiKey);
	const geminiModel = genAI.getGenerativeModel({
		model,
		generationConfig: {
			temperature: temperature,
		},
	});

	return geminiModel
		.generateContent(`${prompts.system}\n\n${prompts.user}`)
		.then((response) => response.response.text())
		.catch((error) => {
			throw new SendPromptError(error.message, params);
		});
}

export class SendPromptError extends Error {
	public params: SendPromptParams;
	public provider: ModelProvider;

	constructor(message: string, params: SendPromptParams) {
		super(message);
		this.name = this.constructor.name;
		this.params = {
			...params,
			apiKey: '***',
		};
		this.provider = getModelProvider(params.model);
	}
}

export async function sendPrompt(params: SendPromptParams): Promise<string> {
	const modelProvider = getModelProvider(params.model);
	switch (modelProvider) {
		case ModelProvider.Anthropic:
			return sendAnthropicPrompt(params);

		case ModelProvider.OpenAI:
			return sendOpenAIPrompt(params);

		case ModelProvider.GoogleAI:
			return sendGeminiPrompt(params);

		default:
			throw new Error('Unsupported model specified.');
	}
}

export function extractXMLContent(text: string): { [key: string]: string } {
	const regex = /<(\w+)>([\s\S]*?)<\/\1>/g;
	const result: { [key: string]: string } = {};
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		result[match[1]] = match[2].trim();
	}
	return result;
}
