import Anthropic from '@anthropic-ai/sdk';
import { cloudflareDocumentation, documentationExtraction, generateWorker } from './markdown';

export function buildPromptForDocs(testFile: string): string {
	return `${documentationExtraction}\n# Test File\n${testFile}\n\n# Documentation File\n${cloudflareDocumentation}\n\n`;
}

export function buildPromptForWorkers(testFile: string, relevantDocs?: string): string {
	const documentationFile = relevantDocs ?? cloudflareDocumentation;
	return `${generateWorker}\n# Test File\n${testFile}\n\n# Documentation File\n${documentationFile}\n\n`;
}

type SendPromptParams = {
	prompt: string;
	model?: 'claude-3-opus-20240229' | 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240229';
};

export async function sendPrompt(anthropic: Anthropic, { prompt, model }: SendPromptParams) {
	const { content } = await anthropic.messages.create({
		model: model ?? 'claude-3-opus-20240229',
		max_tokens: 4000,
		messages: [{ role: 'user', content: prompt }],
		stream: false,
		temperature: 0.1
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
