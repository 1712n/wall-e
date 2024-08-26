import { ProviderRequestParams, Role } from '.';

interface AnthropicQuery {
	model: string;
	max_tokens: number;
	stream: boolean;
	system: string;
	messages: {
		role: Role;
		content: string;
	}[];
}

interface AnthropicHeaders {
	'x-api-key': string;
	'anthropic-beta': string;
	'anthropic-version': string;
	'content-type': string;
}

export interface AnthropicRequest {
	provider: 'anthropic';
	endpoint: string;
	headers: AnthropicHeaders;
	query: AnthropicQuery;
}

export function anthropicRequest({ model, prompts, apiKey, stream }: ProviderRequestParams): AnthropicRequest {
	const { user, system } = prompts;
	return {
		provider: 'anthropic',
		endpoint: 'v1/messages',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
			'content-type': 'application/json',
		},
		query: {
			model: model,
			max_tokens: 8_192,
			stream,
			system,
			messages: [
				{
					role: 'user',
					content: user,
				},
			],
		},
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
