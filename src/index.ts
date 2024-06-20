import { CommandName, GitHub, CommandContext, UserCommand } from './github';
import { buildPromptForDocs, buildPromptForWorkers, extractXMLContent, sendPrompt, ALLOWED_MODELS } from './prompt';
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

function parseCommandArgs(args: string[]) {
	const result = { basePath: '', model: 'claude-3-5-sonnet-20240620' };

	for (const arg of args) {
		const [key, value] = arg.split(':');

		if (!value) {
			continue;
		}

		switch (key) {
			case 'path':
				result.basePath = value;
				break;
			case 'model':
				result.model = value;
				break;
		}
	}

	return result;
}

function ensurePath(basePath: string, subPath: string): string {
	return basePath ? `${basePath}/${subPath}` : subPath;
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
				const { basePath, model } = parseCommandArgs(command.args || []);
				const github = initializeGitHub(env, installationId);

				if (!ALLOWED_MODELS.includes(model)) {
					const allowedModels = ALLOWED_MODELS.map((m) => `- \`${m}\``).join('\n');
					const body = `The model '${model}' is not valid. Please use one of the following options:\n\n${allowedModels}`;
					await github.postComment(context, body);
					return;
				}

				switch (command.name) {
					case CommandName.Generate:
						{
							const workingCommentId = await github.postComment(context, 'Working on it... ⚙️');

							// Use the appropriate API key based on the model
							const apiKey = model.startsWith('claude') ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;

							// 1. Get the test file from the repository
							const changedFiles = await github.listPullRequestFiles(context);
							const testFilePath = ensurePath(basePath, 'test/index.spec.ts');
							const testFile = changedFiles.find((file) => file.filename === testFilePath);

							if (!testFile) {
								const body = `Please change the test file (${testFilePath}) in this pull request. It should contain new requirements for the code you will need me to write.`;
								await github.postComment(context, body, workingCommentId);
								return;
							}

							const testFileContent = await github.fetchFileContents(context, testFile.sha);

							// 2. Use the test file and Cloudflare documentation to get only the relevant documentation
							const documentationPrompts = buildPromptForDocs(testFileContent);
							const generatedDocumentation = await sendPrompt({
								model,
								prompts: documentationPrompts,
								temperature: 0,
								apiKey,
							});

							const { relevant_documentation: relevantDocumentation } = extractXMLContent(generatedDocumentation);
							if (!relevantDocumentation) {
								const debugInfo = formatDebugInfo({ prompts: documentationPrompts });
								await github.postComment(
									context,
									`No relevant documentation was found. Using the whole Documentation file ⚠️.\n\n${debugInfo}`,
									workingCommentId,
								);
							}

							// 3. Generate the code based on the test file and relevant documentation
							const generateWorkerPrompts = buildPromptForWorkers(testFileContent, relevantDocumentation);
							const generatedWorker = await sendPrompt({
								model,
								prompts: generateWorkerPrompts,
								apiKey,
							});

							const { completed_code: completedCode } = extractXMLContent(generatedWorker);
							if (!completedCode) {
								const debugInfo = formatDebugInfo({ prompts: generateWorkerPrompts });
								await github.postComment(context, `No code was generated. Please try again.\n\n${debugInfo}`, workingCommentId);
								return;
							}

							// 4. Write the generated file (src/index.ts) to the pull request's branch
							const srcFilePath = ensurePath(basePath, 'src/index.ts');
							const file = { path: srcFilePath, content: completedCode };

							try {
								await github.pushFileToPullRequest(context, file, 'feat: generated code 🤖');
								const elapsedTime = getElapsedSeconds(message.timestamp);
								const debugInfo = formatDebugInfo({
									elapsedTime,
									documentationExtractionPrompt: JSON.stringify(documentationPrompts.system, null, 2),
									relevantDocumentation: JSON.stringify(relevantDocumentation, null, 2),
									generateWorkerPrompt: JSON.stringify(generateWorkerPrompts.system, null, 2),
								});
								const comment = `Code generated successfully! 🎉\n\n${debugInfo}`;
								await github.postComment(context, comment, workingCommentId);
							} catch (error) {
								const elapsedTime = getElapsedSeconds(message.timestamp);
								const debugInfo = formatDebugInfo({ elapsedTime, error });
								const comment = `An error occurred while pushing the code. Please try again.\n\n${debugInfo}`;
								await github.postComment(context, comment, workingCommentId);
							}
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
