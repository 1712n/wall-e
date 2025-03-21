import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandName, GitHub } from '../../src/github';

import worker from '../../src';
import type { GitHubJob } from '../../src';

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
		}))
	}
};

describe('Integration tests for fetch method', () => {
	beforeEach(() => {
		vi.spyOn(GitHub.prototype, 'verifyRequest').mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				headers: { 'content-type': 'application/json' },
			}),
		);

		vi.spyOn(GitHub.prototype, 'postComment').mockResolvedValue(-1);
	});

	it('should return a response with "Nothing to see here..." for GET request', async () => {
		const request = new Request('https://example.com', { method: 'GET' });
		const response = await SELF.fetch(request);
		const text = await response.text();
		expect(text).toBe('<h2>Nothing to see here...</h2>');
	});

	it('should return a 500 response for invalid POST request', async () => {
		const request = new Request('https://example.com', { method: 'POST' });
		const response = await SELF.fetch(request);
		expect(response.status).toBe(500);
	});

	it('should return a valid response for valid POST request', async () => {
		const request = new Request('https://example.com', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-github-delivery': 'test-delivery-id',
				'x-github-event': 'test-event',
				'x-hub-signature-256': 'test-signature',
			},
			body: JSON.stringify({ installation: { id: 123 } }),
		});

		const response = await worker.fetch(request, providedEnv as unknown as Env);
		const json: { ok: boolean } = await response.json();
		expect(json.ok).toBe(true);
	});
});

describe('Integration tests for queue method', () => {
	it('should process a valid job in the queue', async () => {
		const message: Message<GitHubJob> = {
			body: {
				command: { name: CommandName.Generate, args: [] },
				context: { owner: 'test-owner', repo: 'test-repo', issueNumber: 1 },
				installationId: 123,
			},
			ack: vi.fn(),
			id: 'test-id',
			timestamp: new Date(),
			retry: vi.fn(),
			attempts: 0,
		};

		const batch: MessageBatch<GitHubJob> = {
			messages: [message],
			queue: 'test-queue',
			retryAll: vi.fn(),
			ackAll: vi.fn(),
		};

		await worker.queue(batch, providedEnv as unknown as Env);
		expect(message.ack).toHaveBeenCalled();
	});

	it('should handle errors during job processing', async () => {
		const message: Message<GitHubJob> = {
			body: {
				command: { name: CommandName.Generate, args: [] },
				context: { owner: 'test-owner', repo: 'test-repo', issueNumber: 1 },
				installationId: 123,
			},
			ack: vi.fn(),
			id: 'test-id',
			timestamp: new Date(),
			retry: vi.fn(),
			attempts: 0,
		};

		const batch: MessageBatch<GitHubJob> = {
			messages: [message],
			queue: 'test-queue',
			retryAll: vi.fn(),
			ackAll: vi.fn(),
		};

		vi.spyOn(GitHub.prototype, 'postComment').mockImplementation(() => {
			throw new Error('Test error');
		});

		await expect(async () => {
			await worker.queue(batch, providedEnv as unknown as Env);
		}).rejects.toThrow('Test error');

		expect(message.ack).toHaveBeenCalled();
	});
});
