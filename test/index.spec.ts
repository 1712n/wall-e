import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

import '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GitHub App', () => {
	it('responds with "Nothing to see here..."', async () => {
		const request = new IncomingRequest('https://example.com');
		const response = await SELF.fetch(request);
		const text = await response.text();
		expect(text).toBe('<h2>Nothing to see here...</h2>');
	});
});
