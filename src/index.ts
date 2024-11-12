import { CommandName, GitHub, CommandContext, UserCommand } from './github';
import {
	buildPromptForDocs,
	buildPromptForWorkerGeneration,
	sendPrompt,
	buildPromptForAnalyzeSpecFile,
	SendPromptError,
	buildPromptForWorkerImprovement,
} from './prompt';
import { ModelName, ModelProvider, getDefaultModelForProvider, isValidProvider } from './providers';
import { formatDebugInfo, getElapsedSeconds, ensurePath, parseCommandArgs, extractCodeBlockContent, extractXMLContent } from './utils';
import prettier from 'prettier';

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
	provider: ModelProvider;
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
		provider,
		model,
		fallbackModel,
		temperature,
		prompts,
		relevantDocumentation,
	} = params;

	const srcFilePath = ensurePath(basePath, 'src/index.ts');
	const formattedCode = prettier.format(extractCodeBlockContent(generatedCode), { parser: 'typescript' });
	const file = { path: srcFilePath, content: formattedCode };

	try {
		await github.pushFileToPullRequest(context, file, 'feat: generated code 🤖');
		const elapsedTime = getElapsedSeconds(message.timestamp);
		const debugInfo = formatDebugInfo({
			elapsedTime,
			provider,
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
					case CommandName.Improve:
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
			const { basePath, provider, temperature, fallback } = parseCommandArgs(command.args || []);
			const github = initializeGitHub(env, installationId);

			let workingCommentId: number | undefined = undefined;

			try {
				if (!isValidProvider(provider)) {
					const allowedProviders = Object.values(ModelProvider)
						.map((m) => `- \`${m}\``)
						.join('\n');
					const body = `The provider '${provider}' is not valid. Please use one of the following options:\n\n${allowedProviders}`;
					await github.postComment(context, body);
					return;
				}

				workingCommentId = await github.postComment(context, 'Working on it... ⚙️');

				const model = getDefaultModelForProvider(provider);

				switch (command.name) {
					case CommandName.Generate:
						{
							// Get the spec file from the repository
							const changedFiles = await github.listPullRequestFiles(context);
							const specFilePath = ensurePath(basePath, 'test/index.spec.ts');
							const specFile = changedFiles.find((file) => file.filename === specFilePath);

							if (!specFile) {
								const body = `Please change the spec file (${specFilePath}) in this pull request. It should contain new requirements for the code you will need me to write.`;
								await github.postComment(context, body, workingCommentId);
								return;
							}

							const specFileContent = await github.fetchFileContents(context, specFile.sha);

							// Analyze the spec file to check for conflicts with Best Practices
							const analyzeSpecFilePrompts = buildPromptForAnalyzeSpecFile(specFileContent);
							await sendPrompt(
								env,
								{
									model: ModelName.Claude_3_5_Sonnet_20241022,
									prompts: analyzeSpecFilePrompts,
									temperature: 0,
								},
								fallback,
							).then(async ({ model, text }) => {
								if (!text) {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({
										elapsedTime,
										model, // The actual model used to analyze the spec file
										analyzeSpecFilePrompt: JSON.stringify(analyzeSpecFilePrompts.system, null, 2),
										analyzeSpecFileResponse: JSON.stringify(text, null, 2),
									});

									await github.postComment(context, `Unable to analyze spec file. Please try again.\n\n${debugInfo}`, workingCommentId);
									return;
								}

								const { spec_file_analysis_result: specFileAnalysisResult } = extractXMLContent(text);
								if (specFileAnalysisResult) {
									const body = `The following best practices conflicts were detected in the spec file: ${specFileAnalysisResult}`;
									await github.postComment(context, body);
								}
							});

							// Use the spec file and documentation file to get only the relevant documentation
							const documentationPrompts = buildPromptForDocs(specFileContent);
							const relevantDocumentation = await sendPrompt(
								env,
								{
									model: ModelName.Claude_3_5_Sonnet_20241022,
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

							// Generate the code based on the spec file and relevant documentation
							const generateWorkerPrompts = buildPromptForWorkerGeneration(specFileContent, relevantDocumentation);
							await sendPrompt(
								env,
								{
									model,
									prompts: generateWorkerPrompts,
									temperature,
								},
								fallback,
							).then(async ({ provider, model: fallbackModel, text }) => {
								const { generated_code: generatedCode } = extractXMLContent(text);
								if (!generatedCode) {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({
										elapsedTime,
										provider,
										model: fallbackModel ?? model, // The actual model used to generate the code
										temperature,
										generateWorkerPrompt: JSON.stringify(generateWorkerPrompts.system, null, 2),
										relevantDocumentation: JSON.stringify(relevantDocumentation, null, 2),
										modelResponse: JSON.stringify(text, null, 2),
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
									provider,
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

					case CommandName.Improve:
						{
							// Retrieve the list of files changed in the pull request
							const pullRequestFiles = await github.listPullRequestFiles(context);
							const specFilePath = ensurePath(basePath, 'test/index.spec.ts');
							const specFile = pullRequestFiles.find((file) => file.filename === specFilePath);

							if (!specFile) {
								const message = `The specification file (${specFilePath}) is missing from this pull request. Please include it to define the new requirements for the code to be written.`;
								await github.postComment(context, message, workingCommentId);
								return;
							}

							const indexFilePath = ensurePath(basePath, 'src/index.ts');
							let indexFile = pullRequestFiles.find((file) => file.filename === indexFilePath);

							if (!indexFile) {
								const existingIndexFile = await github.getMainBranchFile(context, indexFilePath);
								if (!existingIndexFile) {
									const message = `The index file (${indexFilePath}) was not found in the repository. Please create it and try again.`;
									await github.postComment(context, message, workingCommentId);
									return;
								}

								indexFile = {
									...existingIndexFile,
									filename: existingIndexFile.name,
								};
							}

							// Fetch the contents of the spec file and index file
							const specFileContent = await github.fetchFileContents(context, specFile.sha);
							const indexFileContent = await github.fetchFileContents(context, indexFile!.sha);

							// Generate relevant documentation based on the spec file
							const documentationPrompts = buildPromptForDocs(specFileContent);
							const relevantDocumentation = await sendPrompt(
								env,
								{
									model: ModelName.Claude_3_5_Sonnet_20241022,
									prompts: documentationPrompts,
									temperature: 0,
								},
								fallback,
							).then(async ({ model, text }) => {
								if (!text) {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({
										elapsedTime,
										model, // Model used for extracting relevant documentation
										documentationExtractionPrompt: JSON.stringify(documentationPrompts.system, null, 2),
										documentationExtractionResponse: JSON.stringify(relevantDocumentation, null, 2),
									});
									await github.postComment(
										context,
										`No relevant documentation was extracted. Falling back to using the entire documentation file ⚠️.\n\n${debugInfo}`,
										workingCommentId,
									);
								}
								return text;
							});

							const reviewerFeedback = command.extra;
							if (!reviewerFeedback) {
								const message = `Please provide feedback or suggestions for improvement.`;
								await github.postComment(context, message, workingCommentId);
								return;
							}

							// Use the provided feedback, index file, spec file, and relevant documentation to generate improved code
							const improvementPrompts = buildPromptForWorkerImprovement(
								indexFileContent,
								specFileContent,
								reviewerFeedback,
								relevantDocumentation,
							);
							await sendPrompt(
								env,
								{
									model,
									prompts: improvementPrompts,
									temperature,
								},
								fallback,
							).then(async ({ provider, model: fallbackModel, text }) => {
								const { generated_code: generatedCode } = extractXMLContent(text);
								if (!generatedCode) {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({
										elapsedTime,
										provider,
										model: fallbackModel ?? model, // Model used to generate the code
										temperature,
										improvementPrompts: JSON.stringify(improvementPrompts.system, null, 2),
									});
									await github.postComment(context, `No code was generated. Please try again.\n\n${debugInfo}`, workingCommentId);
									return;
								}

								// Commit the generated code to the pull request branch
								await commitGeneratedCode({
									basePath,
									generatedCode,
									github,
									message,
									context,
									workingCommentId,
									provider,
									model,
									fallbackModel,
									temperature,
									prompts: {
										documentationExtration: documentationPrompts.system,
										generateWorker: improvementPrompts.system,
									},
									relevantDocumentation,
								});
							});
						}
						break;

					case CommandName.Help:
						{
							const body = 'Available commands:\n\n- `/wall-e generate` - Generate code based on the spec file\n\n- `/wall-e improve` - Improve previously generated `index.ts` file';
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
