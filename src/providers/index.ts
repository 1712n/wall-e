import { PromptMessages } from '../prompt';
import { ModelName, ModelProvider } from '../utils';

import { anthropicResponseTextFromSSE, anthropicRequest } from './anthropic';
import { googleAIStudioRequest, googleGeminiResponseText } from './googleai';
import { openAiRequest, openAiResponseTextFromSSE } from './openai';

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
		const messageStartEvent = events.find((event) => event.type === 'message_start');
		if (messageStartEvent?.message?.model) {
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

export async function handleStreamResponse(reader: ReadableStreamDefaultReader<any>): Promise<string> {
	const events = await parseStreamedEvents(reader);
	if (events.length === 0) {
		throw new Error('No events received from the model provider.');
	}

	const provider = getModelProviderFromEvents(events);
	switch (provider) {
		case ModelProvider.Anthropic:
			return anthropicResponseTextFromSSE(events);

		case ModelProvider.OpenAI:
			return openAiResponseTextFromSSE(events);

		case ModelProvider.GoogleAiStudio:
			return googleGeminiResponseText(events);

		default:
			throw new Error(`Provider '${provider}' not implemented`);
	}
}
