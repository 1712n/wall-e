import Anthropic from '@anthropic-ai/sdk';
import { cloudflareDocumentation, documentationExtraction, generateWorker } from './markdown';

export const ALLOWED_MODELS = [
	'claude-3-opus-20240229',
	'claude-3-sonnet-20240229',
	'claude-3-haiku-20240307',
	'claude-3-5-sonnet-20240620',
	'gpt-4o',
];

type PromptMessages = {
	user: string;
	system: string;
};

export function buildPromptForDocs(testFile: string): PromptMessages {
	return {
		system: documentationExtraction,
		user: `# Test File\n${testFile}\n\n# Documentation File\n${cloudflareDocumentation}\n\n`,
	};
}

export function buildPromptForWorkers(testFile: string, relevantDocs?: string): PromptMessages {
	const documentationFile = relevantDocs ?? cloudflareDocumentation;
	return {
		system: generateWorker,
		user: `# Test File\n${testFile}\n\n# Documentation File\n${documentationFile}\n\n`,
	};
}

type SendPromptParams = {
	apiKey: string;
	model: string;
	prompts: PromptMessages;
	temperature?: number;
};

async function sendAnthropicPrompt(params: SendPromptParams) {
	const { apiKey, model, prompts, temperature = 0.5 } = params;

	const anthropic = new Anthropic({
		apiKey: apiKey,
	});

	const { content } = await anthropic.messages.create({
		model,
		max_tokens: 4000,
		system: prompts.system,
		messages: [{ role: 'user', content: prompts.user }],
		stream: false,
		temperature,
	});

	return content[0].text;
}

async function sendOpenAIPrompt(params: SendPromptParams) {
	const { apiKey, model, prompts, temperature = 0.3 } = params;

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
			max_tokens: 4000,
			temperature,
			seed: 0,
		}),
	});

	const data: any = await response.json();
	return data.choices[0].message.content;
}

export async function sendPrompt(params: SendPromptParams): Promise<string> {
	const { model } = params;

	if (model.startsWith('claude')) {
		return sendAnthropicPrompt(params);
	}

	if (model.startsWith('gpt')) {
		return sendOpenAIPrompt(params);
	}

	throw new Error('Unsupported model specified.');
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
