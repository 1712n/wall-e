import { Role, ProviderRequestParams, ModelName } from '.';

interface GoogleAIStudioContent {
	role: Role;
	parts: {
		text: string;
	}[];
}

interface GoogleAIStudioQuery {
	contents: GoogleAIStudioContent[];
	tools?: {
		google_search: {};
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

	if (model !== ModelName.Gemini_Exp) {
		tools.push({ google_search: {} });
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

export function googleGeminiParsedResponse(response: GoogleGeminiResponse[], requestedModel: ModelName): GoogleGeminiParsedResponse {
	let text = '';
	let meta = [];

	for (const res of response) {
		try {
			if (Array.isArray(res.candidates)) {
				for (const candidate of res.candidates) {
					if (candidate.content && candidate.content.parts) {
						for (const part of candidate.content.parts) {
							text += part.text;
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
			throw error;
		}
	}

	return {
		text,
		model: requestedModel,
		meta
	};
}
