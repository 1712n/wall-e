import { describe, expect, it } from 'vitest';
import { googleGeminiParsedResponse } from '../../src/providers/googleai';
import { extractGeneratedCode } from '../../src/utils';

describe('extractGeneratedCode', () => {
	it('should parse response with missing opening XML tag', async () => {
		const { default: response } = await import('./googleai/missing-open-xml-tag-response.json');

		const { text } = googleGeminiParsedResponse(response);
		const generatedCode = extractGeneratedCode(text);

		expect(generatedCode).toBeDefined();
		expect(generatedCode).not.contain('generated_code>');
	});

	it('should parse response with missing closing XML tag', async () => {
		const { default: response } = await import('./googleai/missing-close-xml-tag-response.json');

		const { text } = googleGeminiParsedResponse(response);
		const generatedCode = extractGeneratedCode(text);

		expect(generatedCode).toBeDefined();
		expect(generatedCode).not.contain('generated_code>');
	});

	it('should parse response with no XML tags', async () => {
		const { default: response } = await import('./googleai/missing-xml-tags-response.json');

		const { text } = googleGeminiParsedResponse(response);
		const generatedCode = extractGeneratedCode(text);

		expect(generatedCode).toBeDefined();
		expect(generatedCode).not.contain('generated_code>');
	});

	it('should parse response with proper open/close XML tags', async () => {
		const { default: response } = await import('./googleai/present-xml-tags-response.json');

		const { text } = googleGeminiParsedResponse(response);
		const generatedCode = extractGeneratedCode(text);

		expect(generatedCode).toBeDefined();
		expect(generatedCode).not.contain('generated_code>');
	});
});
