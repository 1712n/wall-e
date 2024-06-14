import documentation from './markdown/documentation.md';

type BuildPromptParams = {
	testFile: string;
};

export function buildPrompt({ testFile }: BuildPromptParams): string {
	return `# Test File\n\n${testFile}\n\n` + `# Cloudflare Documentation\n\n${documentation}\n`;
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
