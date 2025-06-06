import { describe, it, expect, vi } from 'vitest';
import { env } from 'cloudflare:test';
import {
	buildPromptForWorkerGeneration,
	buildPromptForWorkerImprovement,
	buildPromptForAnalyzeSpecFile,
	sendPrompt,
	SendPromptError,
} from '../../src/prompt';
import { ModelName } from '../../src/providers';

const providedEnv = {
	...env,
	ANTHROPIC_API_KEY: 'test-anthropic',
	OPENAI_API_KEY: 'test-openai',
	GEMINI_API_KEY: 'test-gemini',
	GH_PRIVATE_KEY: 'test-private-key',
	GH_WEBHOOK_SECRET: 'test-webhook-secret',
	INVOCATION_LOCK: {
		idFromName: vi.fn((name: string) => name),
		get: vi.fn((id: string) => ({
			fetch: vi.fn((url: string, init: RequestInit) => ({
				ok: true,
			})),
		})),
	},
};

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
		it('should throw SendPromptError on request failure', async () => {
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

			// @ts-ignore
			global.fetch = fetchMock;

			await expect(() => sendPrompt(providedEnv as unknown as Env, params, false)).rejects.toThrow(SendPromptError);
		});
	});
});
