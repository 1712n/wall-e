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

export function parseCommandArgs(args: string[]) {
	const result = { basePath: '', model: ModelName.Claude_3_5_Sonnet_20240620, temperature: 0.5, fallback: true };

	for (const arg of args) {
		const [key, value] = arg.split(':');

		if (!value) {
			continue;
		}

		switch (key) {
			case 'path':
				result.basePath = value;
				break;
			case 'model':
				result.model = value as ModelName;
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
		}
	}

	return result;
}

export enum ModelProvider {
	Anthropic = 'anthropic',
	OpenAI = 'openai',
	GoogleAiStudio = 'google-ai-studio',
	Unknown = 'unknown',
}

export enum ModelName {
	Claude_3_Opus_20240229 = 'claude-3-opus-20240229',
	Claude_3_Haiku_20240307 = 'claude-3-haiku-20240307',
	Claude_3_Sonnet_20240229 = 'claude-3-sonnet-20240229',
	Claude_3_5_Sonnet_20240620 = 'claude-3-5-sonnet-20240620',
	GPT_4o = 'gpt-4o',
	Gemini_1_5_Pro = 'gemini-1.5-pro',
	Gemini_1_5_Pro_Exp_0801 = 'gemini-1.5-pro-exp-0801',
}

export function getApiKeyForModelProvider(provider: ModelProvider, env: Env): string {
	switch (provider) {
		case ModelProvider.Anthropic:
			return env.ANTHROPIC_API_KEY;

		case ModelProvider.OpenAI:
			return env.OPENAI_API_KEY;

		case ModelProvider.GoogleAiStudio:
			return env.GEMINI_API_KEY;

		default:
			throw new Error('Unsupported model provider specified.');
	}
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
	return text.replace(/^```[\w]*\n([\s\S]*?)\n```$/gm, '$1');
}
