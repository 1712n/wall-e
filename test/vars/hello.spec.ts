/**
 * The Hello World worker responds 'Hello World' to all requests.
 */

import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('Hello World worker', () => {
  /**
   * This test checks the fundamental functionality of the Hello World worker.
   * 
   * Input: An HTTP request to the worker.
   * Expected Output: A response with status 200 and the text "Hello World".
   */
  it('should respond with "Hello World" on an HTTP request', async () => {
    const response = await SELF.fetch('https://example.com/');

    // Check that the response status is 200
    expect(response.status).toBe(200);

    // Check that the response text is "Hello World"
    const text = await response.text();
    expect(text).toBe('Hello World');
  });
});
