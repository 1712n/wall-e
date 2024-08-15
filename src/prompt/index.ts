import { GoogleGenerativeAI } from '@google/generative-ai';
import { documentation, documentationExtraction, generateWorker, analyzeTestFile, testFileBestPractices } from './markdown';

export const ALLOWED_MODELS = [
	'claude-3-opus-20240229',
	'claude-3-sonnet-20240229',
	'claude-3-haiku-20240307',
	'claude-3-5-sonnet-20240620',
	'gpt-4o',
	'gemini-1.5-pro',
	'gemini-1.5-pro-exp-0801',
];

type PromptMessages = {
	user: string;
	system: string;
};

export function buildPromptForDocs(testFile: string): PromptMessages {
	return {
		system: documentationExtraction,
		user: `<test_file>\n\n${testFile}\n\n</test_file>\n\n<documentation_file>\n${documentation}\n\n</documentation_file>`,
	};
}

export function buildPromptForWorkers(testFile: string, relevantDocs?: string): PromptMessages {
	const documentationFile = relevantDocs ?? documentation;
	return {
		system: generateWorker,
		user: `<test_file>\n\n${testFile}\n\n</test_file>\n\n<documentation_file>\n\n${documentationFile}\n\n</documentation_file>`,
	};
}

export function buildPromptForAnalyzeTestFile(testFile: string): PromptMessages {
	return {
		system: `${analyzeTestFile}\n\n<best_practices>\n\n${testFileBestPractices}</best_practices>`,
		user: `<test_file>\n\n${testFile}\n\n</test_file>`,
	};
}

type SendPromptParams = {
	apiKey: string;
	model: string;
	prompts: PromptMessages;
	temperature: number;
};

async function sendAnthropicPrompt(params: SendPromptParams) {
	const { apiKey, model, prompts, temperature } = params;

	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'content-type': 'application/json',
			'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model,
			max_tokens: 8_192,
			system: prompts.system,
			messages: [{ role: 'user', content: prompts.user }],
			stream: false,
			temperature,
		}),
	});

	if (!response.ok) {
		const data: any = await response.json();
		throw new Error(`${data.error.type} (Status ${response.status}) - ${data.error.message}`);
	}

	const data: any = await response.json();
	const content = data.content;

	if (content.length > 0 && content[0].type === 'text') {
		return content[0].text;
	}

	throw new Error('Unexpected response format');
}

async function sendOpenAIPrompt(params: SendPromptParams): Promise<string> {
	const { apiKey, model, prompts, temperature } = params;

	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: 'system', content: prompts.system },
				{ role: 'user', content: prompts.user },
			],
			max_tokens: 4_096,
			temperature,
			seed: 0,
		}),
	});

	const data: any = await response.json();
	if (data.error) {
		throw Error(data.error.message);
	}

	return data.choices[0].message.content;
}

async function sendGeminiPrompt(params: SendPromptParams): Promise<string> {
	const { apiKey, model, prompts, temperature } = params;

	const genAI = new GoogleGenerativeAI(apiKey);
	const geminiModel = genAI.getGenerativeModel({
		model,
		generationConfig: {
			temperature: temperature,
		},
	});
  
	try {
		const result = await geminiModel.generateContent(`${prompts.system}\n\n${prompts.user}`);
		return result.response.text();
	}
	catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error in Google AI API: ${error.message}`);
    } else {
      throw new Error('An unknown error occurred in the Google AI API');
    }
  }
}

export async function sendPrompt(params: SendPromptParams): Promise<string> {
  const { model } = params;

  try {
    if (model.startsWith('claude')) {
      return await sendAnthropicPrompt(params);
    }

    if (model.startsWith('gpt')) {
      return await sendOpenAIPrompt(params);
    }

    if (model.startsWith('gemini')) {
      return await sendGeminiPrompt(params);
    }

    throw new Error('Unsupported model specified.');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error in ${getModelProvider(model)} API: ${error.message}`);
    } else {
      throw new Error(`An unknown error occurred in the ${getModelProvider(model)} API`);
    }
  }
}

function getModelProvider(model: string): string {
  if (model.startsWith('claude')) return 'Anthropic';
  if (model.startsWith('gpt')) return 'OpenAI';
  if (model.startsWith('gemini')) return 'Google AI';
  return 'Unknown';
}

export function extractXMLContent(text: string): { [key: string]: string } {
	const regex = /<(\w+)>([\s\S]*?)<\/\1>/g;
	const result: { [key: string]: string } = {};
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		result[match[1]] = match[2].trim();
	}
	return result;
}
