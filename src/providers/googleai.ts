import { Role, ProviderRequestParams } from '.';

interface GoogleAIStudioContent {
	role: Role;
	parts: {
		text: string;
	}[];
}

interface GoogleAIStudioQuery {
	contents: GoogleAIStudioContent[];
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
					role: 'system',
					parts: [{ text: system }],
				},
				{
					role: 'user',
					parts: [{ text: user }],
				},
			],
		},
	};
}
