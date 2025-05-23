import { ProviderRequestParams, Role, ModelName } from '.';

interface AnthropicQuery {
	model: string;
	max_tokens: number;
	stream: boolean;
	system: string;
	messages: {
		role: Role;
		content: string;
	}[];
	thinking?: {
		type: string;
		budget_tokens: number;
	};
	temperature?: number;
}

interface AnthropicHeaders {
	'x-api-key': string;
	'anthropic-beta'?: string;
	'anthropic-version': string;
	'content-type': string;
}

export interface AnthropicRequest {
	provider: 'anthropic';
	endpoint: string;
	headers: AnthropicHeaders;
	query: AnthropicQuery;
}

export function anthropicRequest({ model, prompts, apiKey, stream, temperature }: ProviderRequestParams): AnthropicRequest {
	const { user, system } = prompts;
	const headers: AnthropicHeaders = {
		'x-api-key': apiKey,
		'anthropic-version': '2023-06-01',
		'content-type': 'application/json',
	};

	let actualModel = model;
	
	// Map thinking variants to base models
	if (model === ModelName.Claude_4_Opus_thinking) {
		actualModel = ModelName.Claude_4_Opus;
	} else if (model === ModelName.Claude_4_Sonnet_thinking) {
		actualModel = ModelName.Claude_4_Sonnet;
	}

	const query: AnthropicQuery = {
		model: actualModel,
		max_tokens: 8_192,
		stream,
		system,
		messages: [
			{
				role: 'user',
				content: user,
			},
		],
		temperature,
	};

	if (model === ModelName.Claude_4_Sonnet_thinking || model === ModelName.Claude_4_Opus_thinking) {
		query.max_tokens = 128_000;
		query.thinking = {
			type: 'enabled',
			budget_tokens: 32_000,
		};
		query.temperature = 1; // Temperature may only be set to 1 when thinking is enabled
	} else if (model === ModelName.Claude_4_Opus || model === ModelName.Claude_4_Sonnet) {
		query.max_tokens = 128_000;
	}

	return {
		provider: 'anthropic',
		endpoint: 'v1/messages',
		headers,
		query,
	};
}

type AnthropicSSE = {
	type: 'content_block_delta';
	index: number;
	delta: {
		type: 'text_delta';
		text: string;
	};
};

export function anthropicResponseTextFromSSE(sse: AnthropicSSE[]): string {
	let result = '';

	for (const event of sse) {
		try {
			// Check if the event type is 'content_block_delta' and it has a delta with type 'text_delta'
			if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
				result += event.delta.text; // Accumulate the text from each delta
			}
		} catch (error) {
			console.error('Error parsing Anthropic SSE:', error);
		}
	}

	return result;
}
