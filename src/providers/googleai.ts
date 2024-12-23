import { Role, ProviderRequestParams, ModelName } from '.';

interface GoogleAIStudioContent {
	role: Role;
	parts: {
		text: string;
	}[];
}

enum DynamicRetrievalMode {
	UNSPECIFIED = 0,
	DYNAMIC = 1,
}

interface DynamicRetrievalConfig {
	dynamicRetrievalConfig: {
		mode: DynamicRetrievalMode;
		dynamicThreshold?: number;
	};
}

interface GoogleAIStudioQuery {
	contents: GoogleAIStudioContent[];
	tools?: {
		googleSearchRetrieval?: DynamicRetrievalConfig;
		googleSearch?: {};
	}[];
}

interface GoogleAIStudioHeaders {
	'content-type': string;
	'x-goog-api-key': string;
}

export interface GoogleAIStudioRequest {
	provider: 'google-ai-studio';
	endpoint: string;
	headers: GoogleAIStudioHeaders;
	query: GoogleAIStudioQuery;
}

export function googleAIStudioRequest({ model, apiKey, prompts }: ProviderRequestParams): GoogleAIStudioRequest {
	const { user, system } = prompts;
	const tools = [];

	const defaultDynamicRetrievalConfig: DynamicRetrievalConfig = {
		dynamicRetrievalConfig: {
			mode: DynamicRetrievalMode.DYNAMIC,
			dynamicThreshold: 0,
		},
	};

	switch (model) {
		case ModelName.Gemini_Flash:
			tools.push({
				googleSearch: {},
			});
			break;

		case ModelName.Gemini_1_5_Pro:
			tools.push({
				googleSearchRetrieval: {
					...defaultDynamicRetrievalConfig,
				},
			});
			break;
	}

	return {
		provider: 'google-ai-studio',
		endpoint: `v1beta/models/${model}:streamGenerateContent`,
		headers: {
			'content-type': 'application/json',
			'x-goog-api-key': apiKey,
		},
		query: {
			contents: [
				{
					role: 'user',
					parts: [{ text: `${system}\n\n${user}` }],
				},
			],
			tools,
		},
	};
}

type GoogleGeminiResponse = {
	candidates: {
		content: {
			parts: { text: string }[];
			role: string;
		};
		finishReason: string;
		index: number;
		groundingMetadata?: {
			search_entry_point?: {
				rendered_content?: string;
			};
		};
		safetyRatings?: { category: string; probability: string }[];
	}[];
	usageMetadata: {
		promptTokenCount: number;
		candidatesTokenCount: number;
		totalTokenCount: number;
	};
	modelVersion: string;
};

type GoogleGeminiParsedResponse = {
	text: string;
	model: ModelName;
	meta?: any[];
};

export function googleGeminiParsedResponse(response: GoogleGeminiResponse[]): GoogleGeminiParsedResponse {
	let text = '';
	let model;
	let meta = [];

	for (const res of response) {
		try {
			if (Array.isArray(res.candidates)) {
				for (const candidate of res.candidates) {
					if (candidate.content && candidate.content.parts) {
						for (const part of candidate.content.parts) {
							text += part.text; // Accumulate the text from each part
						}

						if (candidate.groundingMetadata) {
							meta.push(candidate.groundingMetadata);
						}
					}
				}
			} else {
				console.warn('Skipping response due to missing or invalid candidates:', res);
			}
		} catch (error) {
			console.error('Error processing response from Gemini model:', error);
			console.error('Gemini response:', JSON.stringify(res, null, 2));
			throw error; // Re-throw the error after logging
		}
	}

	try {
		model = response[0].modelVersion;
	} catch (error) {
		console.error('Error extracting model version from Gemini response:', error);
	}

	return {
		text,
		model: model as ModelName,
		meta,
	};
}
