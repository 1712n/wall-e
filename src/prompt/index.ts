import Anthropic from '@anthropic-ai/sdk';
import { cloudflareDocumentation, documentationExtraction, generateWorker } from './markdown';

type PromptMessages = {
  user: string;
  system: string;
};

export function buildPromptForDocs(testFile: string): PromptMessages {
  return {
    system: documentationExtraction,
    user: `# Test File\n${testFile}\n\n# Documentation File\n${cloudflareDocumentation}\n\n`,
  };
}

export function buildPromptForWorkers(testFile: string, relevantDocs?: string): PromptMessages {
  const documentationFile = relevantDocs ?? cloudflareDocumentation;
  return {
    system: generateWorker,
    user: `# Test File\n${testFile}\n\n# Documentation File\n${documentationFile}\n\n`,
  };
}

type SendPromptParams = {
  prompts: PromptMessages;
  model?: string;
  temperature?: number;
  apiKey: string;
};

async function sendAnthropicPrompt(prompts: PromptMessages, model: string, temperature: number, apiKey: string) {
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  const { content } = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    system: prompts.system,
    messages: [{ role: 'user', content: prompts.user }],
    stream: false,
    temperature,
  });

  return content[0].text;
}

async function sendOpenAIPrompt(prompts: PromptMessages, model: string, temperature: number, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ],
      max_tokens: 4000,
      temperature,
      seed: 0,
    }),
  });

  const data: any = await response.json();
  return data.choices[0].message.content;
}

export async function sendPrompt(params: SendPromptParams): Promise<string> {
  const { prompts, model = 'claude-3-opus-20240229', temperature = 0.3, apiKey } = params;

  if (model.startsWith('claude')) {
    return sendAnthropicPrompt(prompts, model, temperature, apiKey);
  } else if (model.startsWith('gpt')) {
    return sendOpenAIPrompt(prompts, model, temperature, apiKey);
  } else {
    throw new Error('Unsupported model specified.');
  }
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