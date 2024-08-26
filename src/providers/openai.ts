import { ProviderRequestParams, Role } from '.';

interface OpenAIQuery {
	model: string;
	stream: boolean;
	messages: {
		role: Role;
		content: string;
	}[];
	max_tokens?: number;
	temperature?: number;
	seed?: number;
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

export function openAiRequest({ model, apiKey, prompts, temperature, stream }: ProviderRequestParams): OpenAIRequest {
	const { user, system } = prompts;

	return {
		provider: 'openai',
		endpoint: 'chat/completions',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		query: {
			model,
			stream,
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
			temperature,
			seed: 0,
		},
	};
}

type OpenAISSE = {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: {
		delta: {
			content: string;
		};
	}[];
};

export function openAiResponseTextFromSSE(sse: OpenAISSE[]): string {
	let result = '';

	for (const event of sse) {
		try {
			// Check if the event type is 'delta' to accumulate the text
			if (event.choices) {
				const { delta } = event.choices[0];
				result += delta.content; // Accumulate the content from each delta
			}
		} catch (error) {
			console.warn('Skipping events from OpenAI due to an error:', error);
		}
	}

	return result;
}
