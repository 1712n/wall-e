import { Role, ProviderRequestParams } from '.';

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
			tools: [
				{
					google_search: {},
				},
			],
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
};

export function googleGeminiResponseText(response: GoogleGeminiResponse[]): string {
	let result = '';

	for (const res of response) {
		try {
			if (Array.isArray(res.candidates)) {
				for (const candidate of res.candidates) {
					if (candidate.content && candidate.content.parts) {
						for (const part of candidate.content.parts) {
							result += part.text; // Accumulate the text from each part
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

	return result;
}
