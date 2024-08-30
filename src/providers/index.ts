import { PromptMessages, SendPromptResponse } from '../prompt';

import { anthropicResponseTextFromSSE, anthropicRequest } from './anthropic';
import { googleAIStudioRequest, googleGeminiResponseText } from './googleai';
import { openAiRequest, openAiResponseTextFromSSE } from './openai';

export enum ModelProvider {
	Anthropic = 'anthropic',
	OpenAI = 'openai',
	GoogleAiStudio = 'google-ai-studio',
	Unknown = 'unknown',
}

export enum ModelName {
	Claude_3_5_Sonnet_20240620 = 'claude-3-5-sonnet-20240620',
	GPT_4o = 'gpt-4o',
	Gemini_1_5_Pro = 'gemini-1.5-pro',
	Gemini_1_5_Pro_Exp_0801 = 'gemini-1.5-pro-exp-0801',
}

type ModelProviderMap = Record<ModelProvider, { default?: ModelName, models?: ModelName[] }>;

export const MODEL_PROVIDERS: ModelProviderMap = {
	[ModelProvider.Anthropic]: {
		default: ModelName.Claude_3_5_Sonnet_20240620,
		models: [
			ModelName.Claude_3_5_Sonnet_20240620
		]
	},
	[ModelProvider.OpenAI]: {
		default: ModelName.GPT_4o,
		models: [
			ModelName.GPT_4o
		]
	},
	[ModelProvider.GoogleAiStudio]: {
		default: ModelName.Gemini_1_5_Pro_Exp_0801,
		models: [
			ModelName.Gemini_1_5_Pro,
			ModelName.Gemini_1_5_Pro_Exp_0801
		]
	},
	[ModelProvider.Unknown]: {}
};

export function getApiKeyForModelProvider(provider: ModelProvider, env: Env): string {
	switch (provider) {
		case ModelProvider.Anthropic:
			return env.ANTHROPIC_API_KEY;

		case ModelProvider.OpenAI:
			return env.OPENAI_API_KEY;

		case ModelProvider.GoogleAiStudio:
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

export function isValidModel(model: ModelName): boolean {
	return getProviderForModel(model) !== ModelProvider.Unknown;
}

export function getDefaultModelForProvider(provider: ModelProvider): ModelName | undefined {
	return MODEL_PROVIDERS[provider].default;
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

		case ModelProvider.GoogleAiStudio:
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

				try {
					const parsedData = JSON.parse(jsonData);
					events.push(parsedData);
				} catch (error) {
					console.error('Error parsing JSON:', error);
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
			return ModelProvider.GoogleAiStudio;
		}
	} catch (error) {
		console.warn(`Events are not from ${ModelProvider.GoogleAiStudio}: ${error}`);
	}

	return ModelProvider.Unknown;
}

export async function handleStreamResponse(reader: ReadableStreamDefaultReader<any>): Promise<SendPromptResponse> {
	const events = await parseStreamedEvents(reader);
	if (events.length === 0) {
		throw new Error('No events received from the model provider.');
	}

	const provider = getModelProviderFromEvents(events);
	switch (provider) {
		case ModelProvider.Anthropic:
			return {
				text: anthropicResponseTextFromSSE(events),
				provider,
				model: events[0].message.model,
			};

		case ModelProvider.OpenAI:
			return {
				text: openAiResponseTextFromSSE(events),
				provider,
				model: events[0].model,
			};

		case ModelProvider.GoogleAiStudio:
			return {
				text: googleGeminiResponseText(events),
				provider,
			};

		default:
			throw new Error(`Provider '${provider}' not implemented`);
	}
}
