import { describe, it, expect, vi } from 'vitest';
import {
  buildPromptForWorkerGeneration,
  buildPromptForWorkerImprovement,
  buildPromptForAnalyzeSpecFile,
  sendPrompt,
  SendPromptError,
} from '../../src/prompt';
import { ModelName, ModelProvider } from '../../src/providers';

describe('Unit tests for prompt functions', () => {
  describe('buildPromptForWorkerGeneration', () => {
    it('should build the correct prompt for worker generation', () => {
      const specFile = 'spec content';
      const prompt = buildPromptForWorkerGeneration(specFile);
      expect(prompt).toEqual({
        system: expect.any(String),
        user: `<spec_file>\n${specFile}\n</spec_file>\n\n`,
      });
    });
  });

  describe('buildPromptForWorkerImprovement', () => {
    it('should build the correct prompt for worker improvement', () => {
      const indexFile = 'index content';
      const specFile = 'spec content';
      const reviewerFeedback = 'feedback content';
      const prompt = buildPromptForWorkerImprovement(indexFile, specFile, reviewerFeedback);
      expect(prompt).toEqual({
        system: expect.any(String),
        user: `<index_file>\n${indexFile}\n</index_file>\n\n<reviewer_feedback>\n${reviewerFeedback}\n</reviewer_feedback>\n\n<spec_file>\n${specFile}\n</spec_file>\n\n`,
      });
    });
  });

  describe('buildPromptForAnalyzeSpecFile', () => {
    it('should build the correct prompt for analyzing spec file', () => {
      const specFile = 'spec content';
      const prompt = buildPromptForAnalyzeSpecFile(specFile);
      expect(prompt).toEqual({
        system: expect.any(String),
        user: `<spec_file>\n${specFile}\n</spec_file>`,
      });
    });
  });

  describe('sendPrompt', () => {
    it('should send a prompt and return a response', async () => {
      const env = {
        CF_ACCOUNT_ID: 'test-account-id',
        CF_GATEWAY_AI_ID: 'test-gateway-id',
        ANTHROPIC_API_KEY: 'test-anthropic-api-key',
        OPENAI_API_KEY: 'test-openai-api-key',
        GEMINI_API_KEY: 'test-gemini-api-key',
      } as unknown as Env;

      const params = {
        model: ModelName.Gemini_Exp_Pro,
        prompts: {
          system: 'system message',
          user: 'user message',
        },
        temperature: 0.5,
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: null }),
          }),
        },
      });

      global.fetch = fetchMock;

      const response = await sendPrompt(env, params, false);
      expect(response).toEqual({
        text: '',
        provider: ModelProvider.GoogleAi,
      });
    });

    it('should throw SendPromptError on request failure', async () => {
      const env = {
        CF_ACCOUNT_ID: 'test-account-id',
        CF_GATEWAY_AI_ID: 'test-gateway-id',
        ANTHROPIC_API_KEY: 'test-anthropic-api-key',
        OPENAI_API_KEY: 'test-openai-api-key',
        GEMINI_API_KEY: 'test-gemini-api-key',
      } as unknown as Env;

      const params = {
        model: ModelName.Gemini_Exp_Pro,
        prompts: {
          system: 'system message',
          user: 'user message',
        },
        temperature: 0.5,
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      });

      global.fetch = fetchMock;

      await expect(sendPrompt(env, params, false)).rejects.toThrow(SendPromptError);
    });
  });
});
