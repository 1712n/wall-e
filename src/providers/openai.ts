import { ModelName, ProviderRequestParams, Role } from '.';

interface OpenAIMessagesQuery {
	model: string;
	stream: boolean;
	messages: {
		role: Role;
		content: string;
	}[];
	max_completion_tokens?: number;
	temperature?: number;
	seed?: number;
}

interface OpenAIResponsesQuery {
	model: string;
	stream: boolean;
	input: {
		role: Role;
		content: string;
	}[];
	instructions?: string;
	temperature?: number;
	reasoning?: {
		effort: string;
	};
}

type OpenAIQuery = OpenAIMessagesQuery | OpenAIResponsesQuery;

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

	if ([ModelName.GPT_o4_Mini, ModelName.GPT_o3].includes(model)) {
		// Use the responses API format
		const query: OpenAIResponsesQuery = {
			model,
			stream,
			/**
			 * What sampling temperature to use, between 0 and 2.
			 * Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
			 */
			temperature: temperature * 2,
			input: [
				{
					role: 'user',
					content: user
				}
			],
			reasoning: {
				effort: "high"
			}
		};

		// Add instructions (equivalent to system message)
		if (system) {
			query.instructions = system;
		}

		return {
			provider: 'openai',
			endpoint: 'responses',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			query,
		};
	} else {
		// Use the chat completions API format
		const query: OpenAIMessagesQuery = {
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
			/**
			 * What sampling temperature to use, between 0 and 2.
			 * Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
			 */
			temperature: temperature * 2,
			seed: 0,
		};

		return {
			provider: 'openai',
			endpoint: 'chat/completions',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			query,
		};
	}
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
