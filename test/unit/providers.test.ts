import { describe, it, expect } from 'vitest';
import { anthropicRequest } from '../../src/providers/anthropic';
import { googleAIStudioRequest, googleGeminiParsedResponse } from '../../src/providers/googleai';
import { openAiRequest } from '../../src/providers/openai';
import { ModelName, ProviderRequestParams } from '../../src/providers';

describe('Anthropic provider', () => {
	it('should build a valid request for Anthropic provider', () => {
		const params: ProviderRequestParams = {
			model: ModelName.Claude_4_Opus,
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
		expect(request.query.model).toBe(ModelName.Claude_4_Opus);
		expect(request.query.messages[0].content).toBe('Test user prompt');
		expect(request.query.system).toBe('Test system prompt');
		expect(request.query.temperature).toBe(0.5);
	});
});

describe('Google AI provider', () => {
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

	it('should parse streamed response', async () => {
		const { default: response } = await import('./googleai/present-xml-tags-response.json');

		const parsedResponse = googleGeminiParsedResponse(response);
		expect(parsedResponse).toBeDefined();
		expect(parsedResponse.model).toBe('gemini-2.0-pro-exp-02-05');
		expect(parsedResponse.metaData).toMatchObject([]);
	});
});

describe('OpenAI provider', () => {
	it('should build a valid request for OpenAI provider', () => {
		const params: ProviderRequestParams = {
			model: ModelName.GPT_4_1,
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
		expect(request.query.model).toBe(ModelName.GPT_4_1);
		expect(request.query.messages[0].content).toBe('Test system prompt');
		expect(request.query.messages[1].content).toBe('Test user prompt');
		expect(request.query.temperature).toBe(1); // OpenAI uses a different scale for temperature
	});
});
