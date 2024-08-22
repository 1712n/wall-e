import { ProviderRequestParams, Role } from '.';

interface OpenAIQuery {
	model: string;
	stream: boolean;
	messages: {
		role: Role;
		content: string;
	}[];
	max_tokens: number;
	temperature: number;
	seed: number;
}

interface OpenAIHeaders {
	Authorization: string;
	'Content-Type': string;
}

export interface OpenAIRequest {
	provider: 'openai';
	endpoint: string;
	headers: OpenAIHeaders;
	query: OpenAIQuery;
}

export function openAiRequest({ model, apiKey, prompts, temperature }: ProviderRequestParams): OpenAIRequest {
	const { user, system } = prompts;

	return {
		provider: 'openai',
		endpoint: 'chat/completions',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		query: {
			model: model,
			stream: true,
			messages: [
				{
					role: 'system',
					content: system,
				},
				{
					role: 'user',
					content: user,
				},
			],
			max_tokens: 4_096,
			temperature: temperature,
			seed: 0,
		},
	};
}
