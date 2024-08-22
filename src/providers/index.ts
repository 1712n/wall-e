import { PromptMessages, SendPromptParams } from '../prompt';
import { getApiKeyForModelProvider, ModelProvider } from '../utils';

import { anthropicRequest } from './anthropic';
import { googleAIStudioRequest } from './googleai';
import { openAiRequest } from './openai';

export type Role = 'user' | 'assistant' | 'system';

export type ProviderRequestParams = {
	model: string;
	apiKey: string;
	prompts: PromptMessages;
	temperature: number;
};

export function buildRequestForModelProvider(modelProvider: ModelProvider, env: Env, { model, prompts, temperature }: SendPromptParams) {
	const apiKey = getApiKeyForModelProvider(env, modelProvider);
	const params = {
		model,
		apiKey,
		prompts,
		temperature,
	};

	switch (modelProvider) {
		case ModelProvider.Anthropic:
			return anthropicRequest(params);

		case ModelProvider.GoogleAiStudio:
			return googleAIStudioRequest(params);

		case ModelProvider.OpenAI:
			return openAiRequest(params);

		default:
			throw new Error(`Provider '${modelProvider}' not implemented`);
	}
}
