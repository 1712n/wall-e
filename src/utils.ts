import { ModelName, ModelProvider } from './providers';

type DebugInfo = {
	[key: string]: any;
};

export function formatDebugInfo(debugInfo: DebugInfo): string {
	return `
    <details>
      <summary>Debug info</summary>
      <ul>${Object.keys(debugInfo)
				.map((key) => {
					let value = debugInfo[key];

					if (typeof value === 'string') {
						value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
					}

					return `<li><strong>${key}</strong>: <code>${value}</code></li>`;
				})
				.join('<br>')}</ul>
    </details>`.trim();
}

export function getElapsedSeconds(start: Date) {
	const now = new Date().getTime();
	return `${(now - start.getTime()) / 1_000}s`;
}

type CommandArgs = {
	basePath: string;
	provider: ModelProvider;
	model?: ModelName;
	temperature: number;
	fallback: boolean;
	disableDocumentation: boolean;
};

export function parseCommandArgs(args: string[]) {
	const result: CommandArgs = {
		basePath: '',
		provider: ModelProvider.GoogleAi,
		temperature: 0.5,
		fallback: true,
		disableDocumentation: false,
	};

	for (const arg of args) {
		const [key, value] = arg.split(':');

		if (!value) {
			continue;
		}

		switch (key) {
			case 'path':
				result.basePath = value;
				break;
			case 'provider':
				result.provider = value as ModelProvider;
				break;
			case 'model':
				result.model = value as ModelName
				break;
			case 'temp':
			case 'temperature':
				const temp = parseFloat(value);
				if (!Number.isNaN(temp)) {
					result.temperature = temp;
				}
				break;
			case 'fallback':
				result.fallback = value !== 'false';
				break;
			case 'disable-docs':
			case 'skip-docs':
			case 'omit-docs':
			case 'disable-documentation':
				result.disableDocumentation = value === 'true';
				break;
		}
	}

	return result;
}

export function ensurePath(basePath: string, subPath: string): string {
	return basePath ? `${basePath}/${subPath}` : subPath;
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

export function extractCodeBlockContent(text: string): string {
	// Match and extract code block content if both opening and closing ``` are present
	const completeCodeBlockPattern = /^```[\w]*\n([\s\S]*?)\n```$/gm;
	if (completeCodeBlockPattern.test(text)) {
		return text.replace(completeCodeBlockPattern, '$1');
	}

	// Remove any standalone ``` at the start or end
	const incompleteOpeningPattern = /^```[\w]*\n?/m;
	const incompleteClosingPattern = /\n?```$/m;

	return text
		.replace(incompleteOpeningPattern, '')
		.replace(incompleteClosingPattern, '');
}
