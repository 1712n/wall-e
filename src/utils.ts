type DebugInfo = {
	[key: string]: any;
};

export function formatDebugInfo(debugInfo: DebugInfo): string {
	return `
    <details>
      <summary>Debug info</summary>
      <ul>${Object.keys(debugInfo)
				.map((key) => `<li><strong>${key}</strong>: <code>${debugInfo[key].replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></li>`)
				.join('<br>')}</ul>
    </details>`.trim();
}

export function getElapsedSeconds(start: Date) {
	const now = new Date().getTime();
	return `${(now - start.getTime()) / 1_000}s`;
}

export function parseCommandArgs(args: string[]) {
	const result = { basePath: '', model: 'claude-3-5-sonnet-20240620', temperature: 0.5 };

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
				result.model = value;
				break;
			case 'temp':
			case 'temperature':
				const temp = parseFloat(value);
				if (!Number.isNaN(temp)) {
					result.temperature = temp;
				}
				break;
		}
	}

	return result;
}

export enum ModelProvider {
	Anthropic = 'Anthropic',
	OpenAI = 'OpenAI',
	GoogleAI = 'Google AI',
	Unknown = 'Unknown',
}

export function getModelProvider(model: string): ModelProvider {
	if (model.startsWith('claude')) {
		return ModelProvider.Anthropic;
	}

	if (model.startsWith('gpt')) {
		return ModelProvider.OpenAI;
	}

	if (model.startsWith('gemini')) {
		return ModelProvider.GoogleAI;
	}

	return ModelProvider.Unknown;
}

export function getApiKeyForModel(env: Env, model: string): string {
	const modelProvider = getModelProvider(model);
	switch (modelProvider) {
		case ModelProvider.Anthropic:
			return env.ANTHROPIC_API_KEY;

		case ModelProvider.OpenAI:
			return env.OPENAI_API_KEY;

		case ModelProvider.GoogleAI:
			return env.GEMINI_API_KEY;

		default:
			throw new Error('Unsupported model provider specified.');
	}
}

export function ensurePath(basePath: string, subPath: string): string {
	return basePath ? `${basePath}/${subPath}` : subPath;
}
