import Anthropic from '@anthropic-ai/sdk';
import { GitHub } from './github';
import { buildPrompt, extractXMLContent } from './prompt';

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

			github.setup(async (command, event) => {
				switch (command.name) {
					case 'hello':
						{
							const body = `Hello @${event.payload.comment.user!.login}!`;
							await github.postComment(event, body);
						}
						break;

					case 'generate':
						{
							const workingCommentId = await github.postComment(event, 'Working on it... ⚙️');

							// 1. Get the test file from the repository
							const changedFiles = await github.listPullRequestFiles(event);
							const testFile = changedFiles.find((file) => file.filename === 'test/index.spec.ts');

							if (!testFile) {
								const body =
									'Please change the test file (test/index.spec.ts) in this pull request. It should contain new requirements for the code you will need me to write.';
								await github.postComment(event, body, workingCommentId);
								return;
							}

							const testFileContent = await github.fetchFileContents(event, testFile.sha);

							// 2. Compile the test file into the prompt template
							const prompt = buildPrompt({
								testFile: testFileContent,
							});

							// 3. Send the prompt to the LLM
							const anthropic = new Anthropic({
								apiKey: env.ANTHROPIC_API_KEY,
							});

							async function generateCode() {
								const output = await anthropic.messages.create({
									model: 'claude-3-opus-20240229',
									max_tokens: 4000,
									messages: [{ role: 'user', content: prompt }],
									stream: false
								});

								const text = output.content[0].text;
								const parsedText = extractXMLContent(text);

								const completedCode = parsedText['completed_code'] ?? '';
								if (!completedCode) {
									await github.postComment(
										event,
										`No code was generated. Please try again.\n\nDebug info: \`\`\`\n${testFileContent}\n\`\`\``,
										workingCommentId,
									);
									return;
								}

								// 4. Write the generated file (src/index.ts) to the pull request's branch
								const file = { path: 'src/index.ts', content: completedCode };
								await github
									.pushFileToPullRequest(event, file, 'feat: generated code 🤖')
									.then(async () => {
										await github.postComment(event, 'Code generated successfully! 🎉', workingCommentId);
									})
									.catch(async (error) => {
										await github.postComment(event, `An error occurred while pushing the code: ${error}`, workingCommentId);
									});
							}

							ctx.waitUntil(generateCode());
						}
						break;

					case 'help':
						{
							const body = 'Available commands:\n\n- `/wall-e generate` - Generate code based on the test file';
							await github.postComment(event, body);
						}
						break;

					default:
						{
							const body = 'The command you entered is not valid. Please use `/wall-e help` to see the available commands.';
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
