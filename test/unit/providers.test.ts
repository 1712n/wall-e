import { describe, it, expect } from 'vitest';
import { anthropicRequest } from '../../src/providers/anthropic';
import { googleAIStudioRequest } from '../../src/providers/googleai';
import { openAiRequest } from '../../src/providers/openai';
import { ModelName, ProviderRequestParams } from '../../src/providers';

describe('anthropicRequest', () => {
	it('should build a valid request for Anthropic provider', () => {
		const params: ProviderRequestParams = {
			model: ModelName.Claude_3_7_Sonnet_20250219,
			apiKey: 'test-api-key',
			prompts: {
				user: 'Test user prompt',
				system: 'Test system prompt',
			},
			temperature: 0.5,
			stream: true,
		};

		const request = anthropicRequest(params);

		expect(request.provider).toBe('anthropic');
		expect(request.endpoint).toBe('v1/messages');
		expect(request.headers['x-api-key']).toBe('test-api-key');
		expect(request.query.model).toBe(ModelName.Claude_3_7_Sonnet_20250219);
		expect(request.query.messages[0].content).toBe('Test user prompt');
		expect(request.query.system).toBe('Test system prompt');
		expect(request.query.temperature).toBe(0.5);
	});
});

describe('googleAIStudioRequest', () => {
	it('should build a valid request for Google AI Studio provider', () => {
		const params: ProviderRequestParams = {
			model: ModelName.Gemini_Exp_Pro,
			apiKey: 'test-api-key',
			prompts: {
				user: 'Test user prompt',
				system: 'Test system prompt',
			},
			temperature: 0.5,
			stream: true,
		};

		const request = googleAIStudioRequest(params);

		expect(request.provider).toBe('google-ai-studio');
		expect(request.endpoint).toBe(`v1beta/models/${ModelName.Gemini_Exp_Pro}:streamGenerateContent`);
		expect(request.headers['x-goog-api-key']).toBe('test-api-key');
		expect(request.query.contents[0].parts[0].text).toBe('Test user prompt');
		expect(request.query.systemInstruction.parts[0].text).toBe('Test system prompt');
		expect(request.query.generationConfig?.temperature).toBe(0.5);
	});
});

describe('openAiRequest', () => {
	it('should build a valid request for OpenAI provider', () => {
		const params: ProviderRequestParams = {
			model: ModelName.GPT_o1_Preview,
			apiKey: 'test-api-key',
			prompts: {
				user: 'Test user prompt',
				system: 'Test system prompt',
			},
			temperature: 0.5,
			stream: true,
		};

		const request = openAiRequest(params);

		expect(request.provider).toBe('openai');
		expect(request.endpoint).toBe('chat/completions');
		expect(request.headers['Authorization']).toBe('Bearer test-api-key');
		expect(request.query.model).toBe(ModelName.GPT_o1_Preview);
		expect(request.query.messages[0].content).toBe('Test system prompt');
		expect(request.query.messages[1].content).toBe('Test user prompt');
		expect(request.query.temperature).toBe(1); // OpenAI uses a different scale for temperature
	});
});
