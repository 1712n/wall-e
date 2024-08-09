import { CommandName, GitHub, CommandContext, UserCommand } from './github';
import {
	buildPromptForDocs,
	buildPromptForWorkers,
	extractXMLContent,
	sendPrompt,
	ALLOWED_MODELS,
	buildPromptForAnalyzeTestFile,
} from './prompt';
import { formatDebugInfo, getElapsedSeconds, ensurePath, parseCommandArgs } from './utils';

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
			const { command, context, installationId } = message.body;
			const { basePath, model, temperature } = parseCommandArgs(command.args || []);
			const github = initializeGitHub(env, installationId);

			let workingCommentId: number | undefined = undefined;

			try {
				if (!ALLOWED_MODELS.includes(model)) {
					const allowedModels = ALLOWED_MODELS.map((m) => `- \`${m}\``).join('\n');
					const body = `The model '${model}' is not valid. Please use one of the following options:\n\n${allowedModels}`;
					await github.postComment(context, body);
					return;
				}

				switch (command.name) {
					case CommandName.Generate:
						{
							workingCommentId = await github.postComment(context, 'Working on it... ⚙️');

							// Use the appropriate API key based on the model
							const apiKey = model.startsWith('claude') ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;

							// Get the test file from the repository
							const changedFiles = await github.listPullRequestFiles(context);
							const testFilePath = ensurePath(basePath, 'test/index.spec.ts');
							const testFile = changedFiles.find((file) => file.filename === testFilePath);

							if (!testFile) {
								const body = `Please change the test file (${testFilePath}) in this pull request. It should contain new requirements for the code you will need me to write.`;
								await github.postComment(context, body, workingCommentId);
								return;
							}

							const testFileContent = await github.fetchFileContents(context, testFile.sha);

							// Analyze the test file to check for conflicts with Best Practices
							const analyzeTestFilePrompts = buildPromptForAnalyzeTestFile(testFileContent);
							const analyzedTestFile = await sendPrompt({
								model,
								prompts: analyzeTestFilePrompts,
								temperature: 0,
								apiKey,
							});

							if (!analyzedTestFile) {
								const elapsedTime = getElapsedSeconds(message.timestamp);
								const debugInfo = formatDebugInfo({
									elapsedTime,
									model,
									analyzeTestFilePrompt: JSON.stringify(analyzeTestFilePrompts.system, null, 2),
									analyzeTestFileResponse: JSON.stringify(analyzedTestFile, null, 2),
								});
								await github.postComment(context, `Unable to analyze test file. Please try again.\n\n${debugInfo}`, workingCommentId);
							} else {
								const { test_file_analysis_result: testFileAnalysisResult } = extractXMLContent(analyzedTestFile);
								if (testFileAnalysisResult) {
									const body = `The following best practices conflicts were detected in the test file: ${testFileAnalysisResult}`;
									await github.postComment(context, body);
								}
							}

							// Use the test file and Cloudflare documentation to get only the relevant documentation
							const documentationPrompts = buildPromptForDocs(testFileContent);
							const relevantDocumentation = await sendPrompt({
								model,
								prompts: documentationPrompts,
								temperature: 0,
								apiKey,
							});

							if (!relevantDocumentation) {
								const elapsedTime = getElapsedSeconds(message.timestamp);
								const debugInfo = formatDebugInfo({
									elapsedTime,
									model,
									documentationExtractionPrompt: JSON.stringify(documentationPrompts.system, null, 2),
									documentationExtractionResponse: JSON.stringify(relevantDocumentation, null, 2),
								});
								await github.postComment(
									context,
									`No relevant documentation was found. Using the whole Documentation file ⚠️.\n\n${debugInfo}`,
									workingCommentId,
								);
							}

							// Generate the code based on the test file and relevant documentation
							const generateWorkerPrompts = buildPromptForWorkers(testFileContent, relevantDocumentation);
							const generatedWorker = await sendPrompt({
								model,
								prompts: generateWorkerPrompts,
								temperature,
								apiKey,
							});

							const { completed_code: completedCode } = extractXMLContent(generatedWorker);
							if (!completedCode) {
								const debugInfo = formatDebugInfo({
									model,
									temperature,
									generateWorkerPrompt: JSON.stringify(generateWorkerPrompts.system, null, 2),
								});
								await github.postComment(context, `No code was generated. Please try again.\n\n${debugInfo}`, workingCommentId);
								return;
							}

							// Write the generated file (src/index.ts) to the pull request's branch
							const srcFilePath = ensurePath(basePath, 'src/index.ts');
							const file = { path: srcFilePath, content: completedCode };

							try {
								await github.pushFileToPullRequest(context, file, 'feat: generated code 🤖');
								const elapsedTime = getElapsedSeconds(message.timestamp);
								const debugInfo = formatDebugInfo({
									elapsedTime,
									model,
									temperature,
									documentationExtractionPrompt: JSON.stringify(documentationPrompts.system, null, 2),
									relevantDocumentation: JSON.stringify(relevantDocumentation, null, 2),
									generateWorkerPrompt: JSON.stringify(generateWorkerPrompts.system, null, 2),
								});
								const comment = `Code generated successfully! 🎉\n\n${debugInfo}`;
								await github.postComment(context, comment, workingCommentId);
							} catch (error) {
								const elapsedTime = getElapsedSeconds(message.timestamp);
								const debugInfo = formatDebugInfo({ elapsedTime, model, temperature, error });
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
			} catch (error: any) {
				const elapsedTime = getElapsedSeconds(message.timestamp);
				const debugInfo = formatDebugInfo({ elapsedTime, model, temperature, error });
				const comment = `Unable to process your command. Please check the Debug Info below for more information.\n\n${debugInfo}`;
				await github.postComment(context, comment, workingCommentId);
			} finally {
				message.ack();
			}
		}
	},
};
