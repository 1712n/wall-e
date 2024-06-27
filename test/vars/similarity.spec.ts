/**
 * The Similarity Score Worker processes incoming messages and returns similarity scores from a Cloudflare Vectorize index.
 * It ensures that each request is authenticated using an API key and can handle both single and batch message inputs.
 */

import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import '../src/index';

describe('Authentication', () => {
	/**
	 * This test checks that the worker returns a 401 Unauthorized status when the API key is missing or invalid.
	 *
	 * Input: An HTTP POST request without an API key.
	 * Expected Output: A response with status 401 and text "Unauthorized".
	 */
	it('returns 401 Unauthorized when API key is missing or invalid', async () => {
		const response = await SELF.fetch('https://example.com/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				text: 'Sample text',
				namespace: 'test-namespace',
			}),
		});

		expect(response.status).toBe(401);
    const text = await response.text();
		expect(text).toBe('Unauthorized');
	});
});

describe('Single message processing', () => {
	/**
	 * This test checks that the worker returns a similarity score for a single message.
	 *
	 * Input: An HTTP POST request with a single text message and a valid API key.
	 * Expected Output: A response with status 200 and a JSON object containing the similarity score.
	 */
	it('returns single scalar result when single scalar text is given', async () => {
		const response = await SELF.fetch('https://example.com/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': 'test-api-key',
			},
			body: JSON.stringify({
				text: 'Sample text',
				namespace: 'test-namespace',
			}),
		});

		expect(response.status).toBe(200);
    const text = await response.text();
		expect(text).toEqual('{"similarity_score":0.5678}');
	});
});

describe('Batch message processing', () => {
	/**
	 * This test checks that the worker limits the number of messages in a batch to a maximum of 3.
	 *
	 * Input: An HTTP POST request with more than 3 text messages and a valid API key.
	 * Expected Output: A response with status 400 and an error message indicating the input is too large.
	 */
	it('limits max inputs', async () => {
		const response = await SELF.fetch('https://example.com/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': 'test-api-key',
			},
			body: JSON.stringify({
				text: [
					'This is a story about an orange cloud',
					'This is a story about a llama',
					'This is a story about a hugging emoji',
					'This is a story about overwhelming courage',
				],
				namespace: 'test-namespace',
			}),
		});

		expect(response.status).toBe(400);
    const text = await response.text();
		expect(text).toEqual('Too big input, property `text` can have max 3 items');
	});

	/**
	 * This test checks that the worker returns similarity scores for multiple messages in a batch.
	 *
	 * Input: An HTTP POST request with up to 3 text messages and a valid API key.
	 * Expected Output: A response with status 200 and a JSON object containing an array of similarity scores.
	 */
	it('returns array results when multiple texts are given', async () => {
		const response = await SELF.fetch('https://example.com/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': 'test-api-key',
			},
			body: JSON.stringify({
				text: ['This is a story about an orange cloud', 'This is a story about a llama', 'This is a story about a hugging emoji'],
				namespace: 'test-namespace',
			}),
		});

		expect(response.status).toBe(200);
    const text = await response.text();
		expect(text).toEqual('{"similarity_score":[0.5678,0.5678,0.5678]}');
	});
});
