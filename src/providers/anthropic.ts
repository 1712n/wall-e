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
	if (model === ModelName.Claude_4_5_Sonnet_thinking) {
		actualModel = ModelName.Claude_4_5_Sonnet;
	}

	const max_tokens = 64_000;

	const query: AnthropicQuery = {
		model: actualModel,
		max_tokens,
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

	// Configure thinking mode for Claude 4.5 Sonnet thinking model
	if (model === ModelName.Claude_4_5_Sonnet_thinking) {
		query.thinking = {
			type: 'enabled',
			budget_tokens: 32_000,
		};
		query.temperature = 1;
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
