import { describe, it, expect } from 'vitest';

import { buildPrompt } from '../src/prompt';

describe('Prompt builder', () => {
	it('returns a string containig the instructions, Spec File and Documentation File', () => {
		const specFile = '{{ spec file goes here }}';
		const prompt = buildPrompt({ specFile });
		expect(prompt).toContain(specFile);
	});
});
