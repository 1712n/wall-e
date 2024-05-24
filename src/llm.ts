type BuildPromptParams = {
  files: string[];
};

export function buildPrompt({ files }: BuildPromptParams): string {
  return `You are an experienced TypeScript coder specializing in Test Driven Development. ` +
    `Your task is to generate one TypeScript file called index.ts to be used as a Cloudflare Worker. ` +
    `Below is a test file that includes comments with functional requirements and vitest integration tests, that the worker will need to pass. ` +
    `${files.map((file) => "```\n"+ file + "\n```").join('\n')}\n\n`;
}
