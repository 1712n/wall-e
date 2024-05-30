// @ts-ignore
import template from './template.md';

type BuildPromptParams = {
	testFile: string;
};

export function buildPrompt(params: BuildPromptParams): string {
	const placeholders = ['testFiles'];

	let prompt: string = template.toString();

	placeholders.forEach((placeholder) => {
		const regex = new RegExp(`{{${placeholder}}}`, 'g');
		switch (placeholder) {
			case 'testFile':
				const file = params[placeholder];
				prompt = prompt.replace(regex, `<test_file>${file}</test_file>`);
		}
	});

	return prompt;
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
