import { ModelName, ProviderRequestParams, Role } from '.';

interface OpenAIQuery {
	model: string;
	stream: boolean;
	messages?: {
		role: Role;
		content: string;
	}[];
	input?: {
		role: Role;
		content: string;
	}[];
	max_completion_tokens?: number;
	temperature?: number;
	seed?: number;
	reasoning?: {
		effort: string;
	};
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
	const { user } = prompts;

	const query: OpenAIQuery = {
		model,
		stream,
		/**
		 * What sampling temperature to use, between 0 and 2.
		 * Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
		 * https://platform.openai.com/docs/api-reference/chat/create#chat-create-temperature
		 */
		temperature: temperature * 2,
		seed: 0,
	};

	if ([ModelName.GPT_o4_Mini, ModelName.GPT_o3].includes(model)) {
		query.reasoning = {
			effort: "high"
		};
		query.input = [
			{
				role: 'user',
				content: user
			}
		];
	} else {
		query.messages = [
			{
				role: 'system',
				content: prompts.system,
			},
			{
				role: 'user',
				content: user,
			},
		];
	}

	return {
		provider: 'openai',
		endpoint: [ModelName.GPT_o4_Mini, ModelName.GPT_o3].includes(model) ? 'responses' : 'chat/completions',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		query,
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
