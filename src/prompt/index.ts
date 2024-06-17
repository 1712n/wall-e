import Anthropic from '@anthropic-ai/sdk';
import { cloudflareDocumentation, documentationExtraction, generateWorker } from './markdown';

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
	prompts: PromptMessages;
	model?: 'claude-3-opus-20240229' | 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240229';
	temperature?: number;
};

export async function sendPrompt(anthropic: Anthropic, { prompts, model, temperature }: SendPromptParams) {
	const { content } = await anthropic.messages.create({
		model: model ?? 'claude-3-opus-20240229',
		max_tokens: 4000,
		system: prompts.system,
		messages: [{ role: 'user', content: prompts.user }],
		stream: false,
		temperature: temperature ?? 0.3,
	});

	return content[0].text;
}

export function extractXMLContent(text: string) {
	const regex = /<(\w+)>([\s\S]*?)<\/\1>/g;
	const result: { [key: string]: string } = {};
	let match: string[] | null = [];
	while ((match = regex.exec(text)) !== null) {
		result[match[1]] = match[2].trim();
	}
	return result;
}

export const documentationExtractionRaw = documentationExtraction;
export const generateWorkerRaw = generateWorker;
