// @ts-ignore
import tempalte from './template.md';

type BuildPromptParams = {
	testFiles: string[];
};

export function buildPrompt(params: BuildPromptParams): string {
	const placeholders = ['testFiles'];

	let prompt: string = tempalte.toString();

	placeholders.forEach((placeholder) => {
		const regex = new RegExp(`{{${placeholder}}}`, 'g');
		switch (placeholder) {
			case 'testFiles':
				const files = params[placeholder];
				const filesContent = files
					.filter((file) => file.trim().length > 0)
					.map((file) => `<test_file>${file}</test_file>`)
					.join('\n');

				prompt = prompt.replace(regex, filesContent);
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
