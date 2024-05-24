type BuildPromptParams = {
	files: string[];
};

export function buildPrompt({ files }: BuildPromptParams): string {
	return (
		`Here is a test file written using the vitest testing framework:\n` +
		`${files
			.filter((file) => file.trim().length > 0)
			.map((file) => `<test_file>${file}</test_file>`)
			.join('\n')}\n\n` +
		`Please carefully read through the entire test file, paying close attention to the comments, ` +
		`which contain important requirements, notes and context for the code you will need to write.\n` +
		`Once you have thoroughly analyzed the test file and its comments, write the code that will make the test pass. ` +
		`Be sure to adhere to all the requirements laid out in the comments.\n` +
		`When you are done, please put your completed code inside <completed_code> tags.`
	);
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
