import { PromptMessages, SendPromptResponse } from '../prompt';

import { anthropicResponseTextFromSSE, anthropicRequest } from './anthropic';
import { googleAIStudioRequest, googleGeminiParsedResponse } from './googleai';
import { openAiRequest, openAiResponseTextFromSSE } from './openai';

export enum ModelProvider {
	Anthropic = 'anthropic',
	OpenAI = 'openai',
	GoogleAi = 'googleai',
	Unknown = 'unknown',
}

export enum ModelName {
	Claude_3_5_Sonnet_20241022 = 'claude-3-5-sonnet-20241022',
	Claude_3_7_Sonnet_20250219 = 'claude-3-7-sonnet-20250219',
	Claude_3_7_Sonnet_20250219_Thinking = 'claude-3-7-sonnet-20250219-thinking',
	GPT_4o = 'gpt-4o-2024-11-20',
	GPT_o1 = 'o1-2024-12-17',
	GPT_o1_Preview = 'o1-preview-2024-09-12',
	GPT_o3_Mini = 'o3-mini-2025-01-31',
	Gemini_Exp_Pro = 'gemini-2.0-pro-exp-02-05',
	Gemini_Exp_Flash_Thinking = 'gemini-2.0-flash-thinking-exp-01-21',
	Gemini_Flash = 'gemini-2.0-flash',
}

type ModelProviderMap = Record<ModelProvider, { default?: ModelName; models?: ModelName[] }>;

export const MODEL_PROVIDERS: ModelProviderMap = {
	[ModelProvider.GoogleAi]: {
		default: ModelName.Gemini_Exp_Pro,
		models: [
			ModelName.Gemini_Flash,
			ModelName.Gemini_Exp_Pro,
			ModelName.Gemini_Exp_Flash_Thinking
		],
	},
	[ModelProvider.Anthropic]: {
		default: ModelName.Claude_3_7_Sonnet_20250219,
		models: [
			ModelName.Claude_3_5_Sonnet_20241022,
			ModelName.Claude_3_7_Sonnet_20250219,
			ModelName.Claude_3_7_Sonnet_20250219_Thinking
		],
	},
	[ModelProvider.OpenAI]: {
		default: ModelName.GPT_o1_Preview,
		models: [
			ModelName.GPT_4o,
			ModelName.GPT_o1,
			ModelName.GPT_o1_Preview,
			ModelName.GPT_o3_Mini
		],
	},
	[ModelProvider.Unknown]: {},
};

export function getApiKeyForModelProvider(provider: ModelProvider, env: Env): string {
	switch (provider) {
		case ModelProvider.Anthropic:
			return env.ANTHROPIC_API_KEY;

		case ModelProvider.OpenAI:
			return env.OPENAI_API_KEY;

		case ModelProvider.GoogleAi:
			return env.GEMINI_API_KEY;

		default:
			throw new Error('Unsupported model provider specified.');
	}
}

export function getProviderForModel(model: ModelName): ModelProvider {
	const providers = Object.keys(MODEL_PROVIDERS) as ModelProvider[];
	for (const provider of providers) {
		const models = MODEL_PROVIDERS[provider].models;
		if (models?.includes(model)) {
			return provider;
		}
	}

	return ModelProvider.Unknown;
}

export function isValidProvider(provider: ModelProvider): boolean {
	return Object.values(ModelProvider).includes(provider);
}

export function isValidModel(model: ModelName): boolean {
	return getProviderForModel(model) !== ModelProvider.Unknown;
}

export function isValidModelForProvider(provider: ModelProvider, model: ModelName): boolean {
	return MODEL_PROVIDERS[provider].models?.includes(model) ?? false;
}

export function getDefaultModelForProvider(provider: ModelProvider): ModelName {
	return MODEL_PROVIDERS[provider].default!;
}

export type Role = 'user' | 'assistant' | 'system';

export type ProviderRequestParams = {
	model: ModelName;
	apiKey: string;
	prompts: PromptMessages;
	temperature: number;
	stream: boolean;
};

export function buildRequestForModelProvider(provider: ModelProvider, params: ProviderRequestParams) {
	console.log(`Building request for provider: ${provider}`);

	switch (provider) {
		case ModelProvider.Anthropic:
			return anthropicRequest(params);

		case ModelProvider.GoogleAi:
			return googleAIStudioRequest(params);

		case ModelProvider.OpenAI:
			return openAiRequest(params);

		default:
			throw new Error(`Provider '${provider}' not implemented`);
	}
}

async function parseStreamedEvents(reader: ReadableStreamDefaultReader<any>): Promise<any[]> {
	const decoder = new TextDecoder();
	let events: any[] = [];
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });

		let endOfEventIndex;

		// Process complete events
		while ((endOfEventIndex = buffer.indexOf('\n\n')) !== -1) {
			const event = buffer.slice(0, endOfEventIndex);
			buffer = buffer.slice(endOfEventIndex + 2);

			// Split the event into lines
			const lines = event.split('\n');

			// Extract and handle the data from the event
			for (const line of lines) {
				if (!line.startsWith('data: ')) {
					continue;
				}

				// Remove 'data: ' and parse the JSON
				const jsonData = line.slice(6).trim();

				if (jsonData === '[DONE]') {
					continue;
				}

				try {
					const parsedData = JSON.parse(jsonData);
					events.push(parsedData);
				} catch (error) {
					console.error('Error parsing JSON:', error, 'Data:', jsonData);
				}
			}
		}
	}

	if (events.length > 0) {
		return events;
	}

	try {
		return JSON.parse(buffer);
	} catch (error) {
		console.error('Error parsing buffer to JSON:', error);
		return [];
	}
}

function getModelProviderFromEvents(events: any[]): ModelProvider {
	if (!events || events.length === 0) {
		console.warn('No events provided');
		return ModelProvider.Unknown;
	}

	try {
		const messageStartEvents = events.filter((event) => event.type === 'message_start');
		if (messageStartEvents.length > 0) {
			return ModelProvider.Anthropic;
		}
	} catch (error) {
		console.warn(`Events are not from ${ModelProvider.Anthropic}: ${error}`);
	}

	try {
		const firstEvent = events[0];
		if (firstEvent.nonce && firstEvent.id) {
			return ModelProvider.OpenAI;
		}
	} catch (error) {
		console.warn(`Events are not from ${ModelProvider.OpenAI}: ${error}`);
	}

	try {
		const firstEvent = events[0];
		if (firstEvent.candidates && firstEvent.usageMetadata) {
			return ModelProvider.GoogleAi;
		}
	} catch (error) {
		console.warn(`Events are not from ${ModelProvider.GoogleAi}: ${error}`);
	}

	return ModelProvider.Unknown;
}

export async function handleStreamResponse(response: Response): Promise<SendPromptResponse> {
	const reader = response.body!.getReader();
	const events = await parseStreamedEvents(reader);
	console.log('All events:', JSON.stringify(events, null, 2));

	if (events.length === 0) {
		throw new Error('No events received from the model provider.');
	}

	const eventId = response.headers.get('cf-aig-event-id');
	const provider = getModelProviderFromEvents(events);
	try {
		switch (provider) {
			case ModelProvider.Anthropic:
				return {
					text: anthropicResponseTextFromSSE(events),
					provider,
					model: events[0].message.model,
					eventId,
				};

			case ModelProvider.OpenAI:
				return {
					text: openAiResponseTextFromSSE(events),
					provider,
					model: events[0].model,
					eventId,
				};

			case ModelProvider.GoogleAi:
				const response = googleGeminiParsedResponse(events);
				return {
					...response,
					provider,
					eventId,
				};

			default:
				throw new Error(`Unknown provider: ${provider}`);
		}
	} catch (error) {
		console.error('Error handling stream response:', error);
		console.error('Streamed events:', JSON.stringify(events, null, 2));
		throw error;
	}
}
