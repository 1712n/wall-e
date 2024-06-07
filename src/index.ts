import Anthropic from '@anthropic-ai/sdk';
import { CommandName, GitHub, CommandContext, UserCommand } from './github';
import { buildPrompt, extractXMLContent } from './prompt';
import { formatDebugInfo, getElapsedSeconds } from './utils';

type GitHubJob = {
	command: UserCommand;
	context: CommandContext;
	installationId: number;
};

function initializeGitHub(env: Env, installationId: number) {
	return new GitHub({
		appId: env.GH_APP_ID,
		privateKey: env.GH_PRIVATE_KEY,
		installationId: installationId,
		webhooks: {
			secret: env.GH_WEBHOOK_SECRET,
		},
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			if (request.method === 'GET') {
				return new Response('<h2>Nothing to see here...</h2>', {
					headers: { 'content-type': 'text/html' },
				});
			}

			const payload = await request.json<any>();
			const github = initializeGitHub(env, payload.installation.id);

			github.setup(async (command, context) => {
				switch (command.name) {
					case CommandName.Generate:
					case CommandName.Help:
						{
							await env.JOB_QUEUE.send({
								command,
								context,
								installationId: payload.installation.id,
							});
						}
						break;

					default:
						{
							const body = 'The command you entered is not valid. Please use `/wall-e help` to see the available commands.';
							await github.postComment(context, body);
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
	async queue(batch: MessageBatch<GitHubJob>, env: Env) {
		for (const message of batch.messages) {
			try {
				const { command, context, installationId } = message.body;
				const github = initializeGitHub(env, installationId);

				switch (command.name) {
					case CommandName.Generate:
						{
							const workingCommentId = await github.postComment(context, 'Working on it... ⚙️');

							// 1. Get the test file from the repository
							const changedFiles = await github.listPullRequestFiles(context);
							const testFile = changedFiles.find((file) => file.filename === 'test/index.spec.ts');

							if (!testFile) {
								const body =
									'Please change the test file (test/index.spec.ts) in this pull request. It should contain new requirements for the code you will need me to write.';
								await github.postComment(context, body, workingCommentId);
								return;
							}

							const testFileContent = await github.fetchFileContents(context, testFile.sha);

							// 2. Compile the test file into the prompt template
							const prompt = buildPrompt({
								testFile: testFileContent,
							});

							// 3. Send the prompt to the LLM
							const anthropic = new Anthropic({
								apiKey: env.ANTHROPIC_API_KEY,
							});

							const output = await anthropic.messages.create({
								model: 'claude-3-opus-20240229',
								max_tokens: 4000,
								messages: [{ role: 'user', content: prompt }],
								stream: false,
							});

							const { text } = output.content[0];
							const parsedText = extractXMLContent(text);

							const completedCode = parsedText['completed_code'] ?? '';
							if (!completedCode) {
								await github.postComment(
									context,
									`No code was generated. Please try again.\n\nDebug info: \`\`\`\n${testFileContent}\n\`\`\``,
									workingCommentId,
								);
								return;
							}

							// 4. Write the generated file (src/index.ts) to the pull request's branch
							const file = { path: 'src/index.ts', content: completedCode };
							await github
								.pushFileToPullRequest(context, file, 'feat: generated code 🤖')
								.then(async () => {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({ elapsedTime });
									const comment = `Code generated successfully! 🎉\n\n${debugInfo}`;
									await github.postComment(context, comment, workingCommentId);
								})
								.catch(async (error) => {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({ elapsedTime, error });
									const comment = `An error occurred while pushing the code. Please try again.\n\n${debugInfo}`;
									await github.postComment(context, comment, workingCommentId);
								});
						}
						break;

					case CommandName.Help:
						{
							const body = 'Available commands:\n\n- `/wall-e generate` - Generate code based on the test file';
							await github.postComment(context, body);
						}
						break;
				}
			} catch (error) {
				console.error(`Failed to process job: ${error}`);
			} finally {
				message.ack();
			}
		}
	},
};
