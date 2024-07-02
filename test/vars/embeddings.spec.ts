/**
 * The Text Embedding Generator API creates embeddings using Workers AI Text Embedding Model.
 * Develop a REST API to generate an embedding from provided text.
 * Only explicitly declare types when TypeScript cannot infer them correctly.
 * Implement extensive error handling and logging. Specifically, if client input is malformed, respond with HTTP error 400.
 */

import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

declare module 'cloudflare:test' {
	interface ProvidedEnv {
		AI: Ai;
	}
}

describe('Embeddings generator', () => {
	it('returns embedding for given text', async () => {
		const response = await SELF.fetch('https://example.com/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				text: `South Korean crypto exchange GDAC hacked for nearly $14M
~
#NFTnews #NFTCommunity #Crypto`,
			}),
		});
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toContain('application/json');

		const result = await response.json<{ embedding: number[] }>();

		expect(typeof result).toBe('object');
		expect(result).toHaveProperty('embedding');
		expect(Array.isArray(result['embedding'])).toBe(true);
		expect(result['embedding'].every((x) => typeof x === 'number')).toBeTruthy();
	});
});
