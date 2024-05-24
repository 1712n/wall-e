import { GitHub } from './github';
import { buildPrompt } from './llm';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			if (request.method === 'GET') {
				return new Response('<h2>Nothing to see here...</h2>', {
					headers: { 'content-type': 'text/html' },
				});
			}

			const payload = await request.json<any>();

			const github = new GitHub({
				appId: env.GH_APP_ID,
				privateKey: env.GH_PRIVATE_KEY,
				installationId: payload.installation.id,
				webhooks: {
					secret: env.GH_WEBHOOK_SECRET,
				},
			});

			await github.setup(async (command, event) => {
				switch (command.name) {
					case 'hello':
						{
							const body = `Hello @${event.payload.comment.user!.login}!`;
							await github.postComment(event, body);
						}
						break;

					case 'generate':
						{
							// 1. Get the test file from the repository
							const testDirFiles = await github.listRepositoryFiles(event, 'test');
							if (testDirFiles.length === 0) {
								await github.postComment(event, `No test files found in the 'test' directory. How will I know if my code passes your expectations? 🤔`);
								return;
							}

							let testFilesContents = await Promise.all(
								testDirFiles
									.filter((file) => file.path.match(/^test\/index.(test|spec)\.ts$/))
									.map((file) => fetch(file.download_url).then((response) => response.text()))
							);

							// 2. Compile the above into the prompt template
							const prompt = buildPrompt({
								files: testFilesContents,
							});
							await github.postComment(event, prompt);

							// 3. Send the prompt to a LLM (i.e: GPT-4)
							// 4. Write the generated files (src/index.ts) to the pull request's branch
						}
						break;

					case 'help':
						{
							const body = 'Available commands: `/wall-e hello`';
							await github.postComment(event, body);
						}
						break;
				}
			});

			return github.verifyRequest({ headers: request.headers, payload });
		} catch (error) {
			console.error(error);

			const response = JSON.stringify({
				error: 'An error occurred while processing the request. Check the logs for more information.',
				ok: false,
			});
			return new Response(response, {
				status: 500,
				headers: {
					'content-type': 'application/json',
				},
			});
		}
	},
};
