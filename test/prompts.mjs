import fs from 'fs/promises';
import path from 'path';

/**
 * TODO: To avoid duplication, use buildPromptForDocs(). Compile the TypeScript file to JavaScript to use it in a .mjs file.
 */
export async function documentation_rag({ vars }) {
	const markdownFilesPath = './src/prompt/markdown';
	const [documentationExtraction, documentationFile] = await Promise.all([
		fs.readFile(path.join(markdownFilesPath, 'documentation_extraction.md'), 'utf-8'),
		fs.readFile(path.join(markdownFilesPath, 'cloudflare_documentation.md'), 'utf-8'),
	]);

	return [
		{
			role: 'system',
			content: documentationExtraction,
		},
		{
			role: 'user',
			content: `# Test File\n${vars.test_file}\n\n# Documentation File\n${documentationFile}\n\n`,
		},
	];
}
