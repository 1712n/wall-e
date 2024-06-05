// @ts-ignore
import documentation from './markdown/documentation.md';
// @ts-ignore
import instructions from './markdown/instructions.md';

type BuildPromptParams = {
	testFile: string;
};

export function buildPrompt({ testFile }: BuildPromptParams): string {
	return `${instructions}\n` + `# Test File\n\n${testFile}\n\n` + `# Cloudflare Documentation\n\n${documentation}\n`;
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
