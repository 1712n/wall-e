import { describe, it, expect } from 'vitest';

import { buildPrompt } from '../src/prompt';

describe('Prompt builder', () => {
	it('returns a string containig the instructions, Test file and Cloudflare Documentation', () => {
		const testFile = '{{ test file goes here }}';
		const prompt = buildPrompt({ testFile });
		expect(prompt).toContain(testFile);
	});
});
