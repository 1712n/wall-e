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

	it('should build a valid request for Claude 4 Opus thinking model', () => {
		const params: ProviderRequestParams = {
			model: ModelName.Claude_4_Opus_thinking,
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
		expect(request.query.model).toBe(ModelName.Claude_4_Opus); // Should map to base model
		expect(request.query.thinking).toBeDefined();
		expect(request.query.thinking?.type).toBe('enabled');
		expect(request.query.thinking?.budget_tokens).toBe(20_000);
		expect(request.query.temperature).toBe(1); // Should be forced to 1 for thinking
		expect(request.query.max_tokens).toBe(32_000);
	});

	it('should build a valid request for Claude 4 Sonnet model without thinking', () => {
		const params: ProviderRequestParams = {
			model: ModelName.Claude_4_5_Sonnet,
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
		expect(request.query.model).toBe(ModelName.Claude_4_5_Sonnet);
		expect(request.query.thinking).toBeUndefined(); // Should not have thinking enabled
		expect(request.query.temperature).toBe(0.5); // Should preserve user temperature
		expect(request.query.max_tokens).toBe(64_000);
	});

	it('should build a valid request for Claude 4 Sonnet thinking model', () => {
		const params: ProviderRequestParams = {
			model: ModelName.Claude_4_5_Sonnet_thinking,
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
		expect(request.query.model).toBe(ModelName.Claude_4_5_Sonnet); // Should map to base model
		expect(request.query.thinking).toBeDefined();
		expect(request.query.thinking?.type).toBe('enabled');
		expect(request.query.thinking?.budget_tokens).toBe(32_000);
		expect(request.query.temperature).toBe(1); // Should be forced to 1 for thinking
		expect(request.query.max_tokens).toBe(64_000);
	});
});

describe('Google AI provider', () => {
	it('should build a valid request for Google AI Studio provider', () => {
		const params: ProviderRequestParams = {
			model: ModelName.Gemini_2_5_Pro,
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
		expect(request.endpoint).toBe(`v1beta/models/${ModelName.Gemini_2_5_Pro}:streamGenerateContent`);
		expect(request.headers['x-goog-api-key']).toBe('test-api-key');
		expect(request.query.contents[0].parts[0].text).toBe('Test user prompt');
		expect(request.query.systemInstruction.parts[0].text).toBe('Test system prompt');
		expect(request.query.generationConfig?.temperature).toBe(0.5);
	});

	it('should parse streamed response', async () => {
		const { default: response } = await import('./googleai/present-xml-tags-response.json');

		const parsedResponse = googleGeminiParsedResponse(response);
		expect(parsedResponse).toBeDefined();
		expect(parsedResponse.model).toBe('gemini-2.5-pro');
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
