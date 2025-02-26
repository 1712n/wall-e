import { describe, it, expect, vi } from 'vitest';
import { fetch, queue } from '../../src/index';
import { CommandName, GitHub, CommandContext, UserCommand } from '../../src/github';

describe('Integration tests for fetch method', () => {
  it('should return a response with "Nothing to see here..." for GET request', async () => {
    const request = new Request('https://example.com', { method: 'GET' });
    const env = {} as Env;
    const response = await fetch(request, env);
    const text = await response.text();
    expect(text).toBe('<h2>Nothing to see here...</h2>');
  });

  it('should return a 500 response for invalid POST request', async () => {
    const request = new Request('https://example.com', { method: 'POST' });
    const env = {} as Env;
    const response = await fetch(request, env);
    expect(response.status).toBe(500);
  });

  it('should return a valid response for valid POST request', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ installation: { id: 123 } }),
    });
    const env = {
      GH_APP_ID: 'test-app-id',
      GH_PRIVATE_KEY: 'test-private-key',
      GH_WEBHOOK_SECRET: 'test-webhook-secret',
      JOB_QUEUE: { send: vi.fn() },
    } as unknown as Env;

    const github = new GitHub({
      appId: env.GH_APP_ID,
      privateKey: env.GH_PRIVATE_KEY,
      installationId: 123,
      webhooks: { secret: env.GH_WEBHOOK_SECRET },
    });

    vi.spyOn(github, 'verifyRequest').mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    const response = await fetch(request, env);
    const json = await response.json();
    expect(json.ok).toBe(true);
  });
});

describe('Integration tests for queue method', () => {
  it('should process a valid job in the queue', async () => {
    const message = {
      body: {
        command: { name: CommandName.Generate, args: [] } as UserCommand,
        context: { owner: 'test-owner', repo: 'test-repo', issueNumber: 1 } as CommandContext,
        installationId: 123,
      },
      ack: vi.fn(),
    };

    const batch = { messages: [message] };
    const env = {
      GH_APP_ID: 'test-app-id',
      GH_PRIVATE_KEY: 'test-private-key',
      GH_WEBHOOK_SECRET: 'test-webhook-secret',
      JOB_QUEUE: { send: vi.fn() },
    } as unknown as Env;

    await queue(batch, env);
    expect(message.ack).toHaveBeenCalled();
  });

  it('should handle errors during job processing', async () => {
    const message = {
      body: {
        command: { name: CommandName.Generate, args: [] } as UserCommand,
        context: { owner: 'test-owner', repo: 'test-repo', issueNumber: 1 } as CommandContext,
        installationId: 123,
      },
      ack: vi.fn(),
    };

    const batch = { messages: [message] };
    const env = {
      GH_APP_ID: 'test-app-id',
      GH_PRIVATE_KEY: 'test-private-key',
      GH_WEBHOOK_SECRET: 'test-webhook-secret',
      JOB_QUEUE: { send: vi.fn() },
    } as unknown as Env;

    vi.spyOn(GitHub.prototype, 'postComment').mockImplementation(() => {
      throw new Error('Test error');
    });

    await queue(batch, env);
    expect(message.ack).toHaveBeenCalled();
  });
});
