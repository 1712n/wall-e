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

export function anthropicRequest({ model, prompts, apiKey }: ProviderRequestParams): AnthropicRequest {
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
			stream: true,
			system: system,
			messages: [
				{
					role: 'user',
					content: user,
				},
			],
		},
	};
}
