import { PromptMessages } from '../prompt';
import { ModelProvider } from '../utils';

import { anthropicResponseTextFromSSE, anthropicRequest } from './anthropic';
import { googleAIStudioRequest } from './googleai';
import { openAiRequest, openAiResponseTextFromSSE } from './openai';

export type Role = 'user' | 'assistant' | 'system';

export type ProviderRequestParams = {
	model: string;
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

async function parseServerSentEvents(reader: ReadableStreamDefaultReader<any>): Promise<any[]> {
	const decoder = new TextDecoder();
	let accumulatedResponses: any[] = [];
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

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
				if (line.startsWith('data: ')) {
					// Remove 'data: ' and parse the JSON
					const jsonData = line.slice(6).trim();

					try {
						const parsedData = JSON.parse(jsonData);
						accumulatedResponses.push(parsedData);
					} catch (error) {
						console.error('Error parsing JSON:', error);
					}
				}
			}
		}
	}

	return accumulatedResponses;
}

function getModelProviderFromEvents(events: any[]): ModelProvider {
	try {
		const event = events.find((event) => event.type === 'message_start');
		return event.message.model.startsWith('claude') && ModelProvider.Anthropic;
	} catch (e) {
		console.warn(`Events are not from ${ModelProvider.Anthropic}`);
	}

	try {
		const event = events[0];
		return event.nonce && event.id && ModelProvider.OpenAI;
	} catch (e) {
		console.warn(`Events are not from ${ModelProvider.OpenAI}`);
	}

	return ModelProvider.Unknown;
}

export async function handleStreamResponse(reader: ReadableStreamDefaultReader<any>): Promise<string> {
	const events = await parseServerSentEvents(reader);
	if (events.length === 0) {
		throw new Error('No events received from the model provider.');
	}

	const provider = getModelProviderFromEvents(events);
	switch (provider) {
		case ModelProvider.Anthropic:
			return anthropicResponseTextFromSSE(events);

		case ModelProvider.OpenAI:
			return openAiResponseTextFromSSE(events);

		default:
			throw new Error(`Provider '${provider}' not implemented`);
	}
}
