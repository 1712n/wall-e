import { CommandName, GitHub, CommandContext, UserCommand } from './github';
import {
	buildPromptForDocs,
	buildPromptForWorkers,
	sendPrompt,
	MODEL_PROVIDERS,
	buildPromptForAnalyzeTestFile,
	SendPromptError,
	isValidModel,
} from './prompt';
import {
	formatDebugInfo,
	getElapsedSeconds,
	ensurePath,
	parseCommandArgs,
	extractCodeBlockContent,
	extractXMLContent,
	ModelName,
} from './utils';

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

type CommitGeneratedCodeParams = {
	basePath: string;
	generatedCode: string;
	github: GitHub;
	message: Message<GitHubJob>;
	context: CommandContext;
	workingCommentId?: number;
	model: ModelName;
	temperature: number;
	fallbackModel?: ModelName;
	prompts: {
		documentationExtration: string;
		generateWorker: string;
	};
	relevantDocumentation: string;
};

async function commitGeneratedCode(params: CommitGeneratedCodeParams) {
	const {
		basePath,
		generatedCode,
		github,
		message,
		context,
		workingCommentId,
		model,
		fallbackModel,
		temperature,
		prompts,
		relevantDocumentation,
	} = params;

	const srcFilePath = ensurePath(basePath, 'src/index.ts');
	const file = { path: srcFilePath, content: extractCodeBlockContent(generatedCode) };

	try {
		await github.pushFileToPullRequest(context, file, 'feat: generated code 🤖');
		const elapsedTime = getElapsedSeconds(message.timestamp);
		const debugInfo = formatDebugInfo({
			elapsedTime,
			model: fallbackModel ?? model,
			temperature,
			documentationExtractionPrompt: JSON.stringify(prompts.documentationExtration, null, 2),
			relevantDocumentation: JSON.stringify(relevantDocumentation, null, 2),
			generateWorkerPrompt: JSON.stringify(prompts.generateWorker, null, 2),
		});
		const comment = `Code generated successfully! 🎉\n\n${debugInfo}`;
		await github.postComment(context, comment, workingCommentId);
	} catch (error) {
		const elapsedTime = getElapsedSeconds(message.timestamp);
		const debugInfo = formatDebugInfo({ elapsedTime, model, fallbackModel, temperature, error });
		const comment = `An error occurred while pushing the code. Please try again.\n\n${debugInfo}`;
		await github.postComment(context, comment, workingCommentId);
	}
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
			const { basePath, model, temperature, fallback } = parseCommandArgs(command.args || []);
			const github = initializeGitHub(env, installationId);

			let workingCommentId: number | undefined = undefined;

			try {
				if (!isValidModel(model)) {
					const allowedModels = Object.values(ModelName)
						.map((m) => `- \`${m}\``)
						.join('\n');
					const body = `The model '${model}' is not valid. Please use one of the following options:\n\n${allowedModels}`;
					await github.postComment(context, body);
					return;
				}

				switch (command.name) {
					case CommandName.Generate:
						{
							workingCommentId = await github.postComment(context, 'Working on it... ⚙️');

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
							await sendPrompt(
								env,
								{
									model: ModelName.Claude_3_5_Sonnet_20240620,
									prompts: analyzeTestFilePrompts,
									temperature: 0,
								},
								fallback,
							).then(async ({ model, text }) => {
								if (!text) {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({
										elapsedTime,
										model, // The actual model used to analyze the test file
										analyzeTestFilePrompt: JSON.stringify(analyzeTestFilePrompts.system, null, 2),
										analyzeTestFileResponse: JSON.stringify(text, null, 2),
									});

									await github.postComment(context, `Unable to analyze test file. Please try again.\n\n${debugInfo}`, workingCommentId);
									return;
								}

								const { test_file_analysis_result: testFileAnalysisResult } = extractXMLContent(text);
								if (testFileAnalysisResult) {
									const body = `The following best practices conflicts were detected in the test file: ${testFileAnalysisResult}`;
									await github.postComment(context, body);
								}
							});

							// Use the test file and Cloudflare documentation to get only the relevant documentation
							const documentationPrompts = buildPromptForDocs(testFileContent);
							const relevantDocumentation = await sendPrompt(
								env,
								{
									model: ModelName.Claude_3_5_Sonnet_20240620,
									prompts: documentationPrompts,
									temperature: 0,
								},
								fallback,
							).then(async ({ model, text }) => {
								if (!text) {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({
										elapsedTime,
										model, // The actual model used to extract the relevant documentation
										documentationExtractionPrompt: JSON.stringify(documentationPrompts.system, null, 2),
										documentationExtractionResponse: JSON.stringify(relevantDocumentation, null, 2),
									});
									await github.postComment(
										context,
										`No relevant documentation was found. Using the whole Documentation file ⚠️.\n\n${debugInfo}`,
										workingCommentId,
									);
								}
								return text;
							});

							// Generate the code based on the test file and relevant documentation
							const generateWorkerPrompts = buildPromptForWorkers(testFileContent, relevantDocumentation);
							await sendPrompt(
								env,
								{
									model,
									prompts: generateWorkerPrompts,
									temperature,
								},
								fallback,
							).then(async ({ model: fallbackModel, text }) => {
								const { generated_code: generatedCode } = extractXMLContent(text);
								if (!generatedCode) {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({
										elapsedTime,
										model: fallbackModel ?? model, // The actual model used to generate the code
										temperature,
										generateWorkerPrompt: JSON.stringify(generateWorkerPrompts.system, null, 2),
									});
									await github.postComment(context, `No code was generated. Please try again.\n\n${debugInfo}`, workingCommentId);
									return;
								}

								// Write the generated file (src/index.ts) to the pull request's branch
								await commitGeneratedCode({
									basePath,
									generatedCode,
									github,
									message,
									context,
									workingCommentId,
									model,
									fallbackModel,
									temperature,
									prompts: {
										documentationExtration: documentationPrompts.system,
										generateWorker: generateWorkerPrompts.system,
									},
									relevantDocumentation,
								});
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
			} catch (error: any) {
				const elapsedTime = getElapsedSeconds(message.timestamp);
				const debugInfo = formatDebugInfo({
					elapsedTime,
					error: error.message,
					stack: JSON.stringify(error.stack, null, 2),
					...(error instanceof SendPromptError ? error.params : {}),
					...(error instanceof SendPromptError && { prompts: JSON.stringify(error.params.prompts.system, null, 2) }),
				});

				const comment =
					error instanceof SendPromptError
						? `A request could not be sent. Please check the Debug Info below for more information.\n\n${debugInfo}`
						: `Unable to process your command. Please check the Debug Info below for more information.\n\n${debugInfo}`;

				await github.postComment(context, comment, workingCommentId);
			} finally {
				message.ack();
			}
		}
	},
};
