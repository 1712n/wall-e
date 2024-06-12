import Anthropic from '@anthropic-ai/sdk';
import { cloudflareDocumentation, documentationExtraction, generateWorker } from './markdown';

type BuildPromptParams = {
	documentation?: string;
	testFile: string;
	type: 'documentation' | 'worker';
};

export function buildPrompt({ testFile, type, ...params }: BuildPromptParams): string {
	let instructions = '';
	let documentation = '';

	switch (type) {
		case 'documentation':
			instructions = documentationExtraction;
			documentation = cloudflareDocumentation;
			break;
		case 'worker':
			instructions = generateWorker;
			documentation = params.documentation ?? cloudflareDocumentation;
			break;
	}

	return `${instructions}\n` + `# Test File\n\n${testFile}\n\n` + `# Cloudflare Documentation\n\n${documentation}\n`;
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
