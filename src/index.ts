import { CommandName, GitHub, CommandContext, UserCommand } from './github';
import {
	buildPromptForWorkerGeneration,
	sendPrompt,
	buildPromptForAnalyzeSpecFile,
	SendPromptError,
	buildPromptForWorkerImprovement,
} from './prompt';
import {
	MODEL_PROVIDERS,
	ModelName,
	ModelProvider,
	getDefaultModelForProvider,
	isValidModel,
	isValidModelForProvider,
	isValidProvider,
} from './providers';
import { formatDebugInfo, getElapsedSeconds, ensurePath, parseCommandArgs, extractXMLContent, extractGeneratedCode } from './utils';
import { startLock, endLock } from './lock';

export { Lock } from './lock';

import * as prettier from 'prettier/standalone';
import * as prettierPluginEstree from 'prettier/plugins/estree';
import * as parserTypeScript from 'prettier/parser-typescript';

export type GitHubJob = {
	command: UserCommand;
	context: CommandContext;
	installationId: number;
	lockId: string;
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
	language?: 'js' | 'ts';
	prompts: {
		generateWorker: string;
	};
	eventId: string | null;
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
		language = 'ts',
		prompts,
		eventId,
	} = params;

	const formattedCode = await prettier.format(generatedCode, {
		parser: language === 'js' ? 'babel' : 'typescript',
		plugins: [prettierPluginEstree, parserTypeScript],
	});
	const extension = language === 'js' ? 'js' : 'ts';
	const srcFilePath = ensurePath(basePath, `src/index.${extension}`);
	const file = { path: srcFilePath, content: formattedCode };

	try {
		await github.pushFileToPullRequest(context, file, 'feat: generated code 🤖');
		const elapsedTime = getElapsedSeconds(message.timestamp);
		const debugInfo = formatDebugInfo({
			elapsedTime,
			provider,
			model: fallbackModel ?? model,
			temperature,
			eventId,
			generateWorkerPrompt: JSON.stringify(prompts.generateWorker, null, 2),
		});
		const comment = `Code generated successfully! 🎉\n\n${debugInfo}`;
		await github.postComment(context, comment, workingCommentId);
	} catch (error) {
		const elapsedTime = getElapsedSeconds(message.timestamp);
		const debugInfo = formatDebugInfo({ elapsedTime, model, fallbackModel, temperature, eventId, error });
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

			const installationId: number = payload.installation.id;
			const github = initializeGitHub(env, installationId);

			github.setup(async (command, context) => {
				const lockId = `${context.owner}/${context.repo}/${context.issueNumber}`;
				const isLocked = await startLock(env, lockId);
				if (!isLocked) {
					const body =
						'A command is already running in this pull request. Please wait for the current command to finish before trying again.';
					await github.postComment(context, body);
					return;
				}

				switch (command.name) {
					case CommandName.Generate:
					case CommandName.Improve:
					case CommandName.Help:
						{
							await env.JOB_QUEUE.send({
								command,
								context,
								installationId: installationId,
								lockId: lockId,
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
			const { command, context, installationId, lockId } = message.body;
			const { basePath, provider, temperature, fallback, ...args } = parseCommandArgs(command.args || []);
			const github = initializeGitHub(env, installationId);

			let workingCommentId: number | undefined = undefined;

			try {
				if (!isValidProvider(provider)) {
					const allowedProviders = Object.values(ModelProvider)
						.filter((p) => p !== ModelProvider.Unknown)
						.map((m) => `- \`${m}\``)
						.join('\n');
					const body = `The provider '${provider}' is not valid. Please use one of the following options:\n\n${allowedProviders}`;
					await github.postComment(context, body);
					return;
				}

				if (args.model && !isValidModel(args.model)) {
					const allowedModels = MODEL_PROVIDERS[provider].models!.map((m) => `- \`${m}\``).join('\n');
					const body = `The model '${args.model}' is not valid. Please use one of the following options:\n\n${allowedModels}`;
					await github.postComment(context, body);
					return;
				}

				const model = args.model ?? getDefaultModelForProvider(provider);

				if (!isValidModelForProvider(provider, model)) {
					const body = `The model '${model}' is not valid for the provider '${provider}'. Please use a valid model for the provider.`;
					await github.postComment(context, body);
					return;
				}

				workingCommentId = await github.postComment(context, 'Working on it... ⚙️');

				switch (command.name) {
					case CommandName.Generate:
						{
							// Get the spec file from the repository
							const changedFiles = await github.listPullRequestFiles(context);

							// Look for both TS and JS spec files
							const tsSpecFilePath = ensurePath(basePath, 'test/index.spec.ts');
							const jsSpecFilePath = ensurePath(basePath, 'test/index.spec.js');

							const tsSpecFile = changedFiles.find((file) => file.filename === tsSpecFilePath);
							const jsSpecFile = changedFiles.find((file) => file.filename === jsSpecFilePath);

							// Determine language and file based on what was found
							let specFile;
							let language: 'js' | 'ts';

							if (tsSpecFile && jsSpecFile) {
								const body = `Found both TypeScript and JavaScript spec files. Please include only one spec file type in your pull request.`;
								await github.postComment(context, body, workingCommentId);
								return;
							} else if (tsSpecFile) {
								specFile = tsSpecFile;
								language = 'ts';
							} else if (jsSpecFile) {
								specFile = jsSpecFile;
								language = 'js';
							} else {
								const body = `No spec file found. Please include either a TypeScript (${tsSpecFilePath}) or JavaScript (${jsSpecFilePath}) spec file in your pull request.`;
								await github.postComment(context, body, workingCommentId);
								return;
							}

							const specFileContent = await github.fetchFileContents(context, specFile.sha);

							// Analyze the spec file to check for conflicts with Best Practices
							const analyzeSpecFilePrompts = buildPromptForAnalyzeSpecFile(specFileContent);
							await sendPrompt(
								env,
								{
									model: ModelName.Gemini_Exp_Pro,
									prompts: analyzeSpecFilePrompts,
									temperature: 0.5,
								},
								fallback,
							).then(async ({ model, text, eventId }) => {
								if (!text) {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({
										elapsedTime,
										model, // The actual model used to analyze the spec file
										eventId,
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

							// Generate the code based on the spec file
							const generateWorkerPrompts = buildPromptForWorkerGeneration(specFileContent, language);
							await sendPrompt(
								env,
								{
									model,
									prompts: generateWorkerPrompts,
									temperature,
								},
								fallback,
							).then(async ({ provider, model: fallbackModel, text, eventId }) => {
								const generatedCode = extractGeneratedCode(text);
								if (!generatedCode) {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({
										elapsedTime,
										provider,
										model: fallbackModel ?? model, // The actual model used to generate the code
										temperature,
										eventId,
										generateWorkerPrompt: JSON.stringify(generateWorkerPrompts.system, null, 2),
										modelResponse: JSON.stringify(text, null, 2),
									});
									await github.postComment(context, `No code was generated. Please try again.\n\n${debugInfo}`, workingCommentId);
									return;
								}

								// Write the generated file to the pull request's branch
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
									language,
									prompts: {
										generateWorker: generateWorkerPrompts.system,
									},
									eventId,
								});
							});
						}
						break;

					case CommandName.Improve:
						{
							// Retrieve the list of files changed in the pull request
							const pullRequestFiles = await github.listPullRequestFiles(context);

							// Look for both TS and JS spec files
							const tsSpecFilePath = ensurePath(basePath, 'test/index.spec.ts');
							const jsSpecFilePath = ensurePath(basePath, 'test/index.spec.js');

							const tsSpecFile = pullRequestFiles.find((file) => file.filename === tsSpecFilePath);
							const jsSpecFile = pullRequestFiles.find((file) => file.filename === jsSpecFilePath);

							// Determine language and file based on what was found
							let specFile;
							let language: 'js' | 'ts';

							if (tsSpecFile && jsSpecFile) {
								const body = `Found both TypeScript and JavaScript spec files. Please include only one spec file type in your pull request.`;
								await github.postComment(context, body, workingCommentId);
								return;
							} else if (tsSpecFile) {
								specFile = tsSpecFile;
								language = 'ts';
							} else if (jsSpecFile) {
								specFile = jsSpecFile;
								language = 'js';
							} else {
								const body = `No spec file found. Please include either a TypeScript (${tsSpecFilePath}) or JavaScript (${jsSpecFilePath}) spec file in your pull request.`;
								await github.postComment(context, body, workingCommentId);
								return;
							}

							// Look for both TS and JS index files
							const tsIndexFilePath = ensurePath(basePath, 'src/index.ts');
							const jsIndexFilePath = ensurePath(basePath, 'src/index.js');

							// First try to find the index file matching the language of the spec file
							const preferredIndexFilePath = language === 'js' ? jsIndexFilePath : tsIndexFilePath;
							let indexFile = pullRequestFiles.find((file) => file.filename === preferredIndexFilePath);

							// If not found, try the other language as fallback
							if (!indexFile) {
								const fallbackIndexFilePath = language === 'js' ? tsIndexFilePath : jsIndexFilePath;
								indexFile = pullRequestFiles.find((file) => file.filename === fallbackIndexFilePath);
							}

							if (!indexFile) {
								// Try to get the index file from the main branch, prioritizing the language of the spec file
								const preferredFilePath = language === 'js' ? jsIndexFilePath : tsIndexFilePath;
								let existingIndexFile = await github.getMainBranchFile(context, preferredFilePath);

								// If not found, try the other language as fallback
								if (!existingIndexFile) {
									const fallbackFilePath = language === 'js' ? tsIndexFilePath : jsIndexFilePath;
									existingIndexFile = await github.getMainBranchFile(context, fallbackFilePath);
								}

								if (!existingIndexFile) {
									const message = `No index file was found in the repository. Please create either a JavaScript (${jsIndexFilePath}) or TypeScript (${tsIndexFilePath}) index file and try again.`;
									await github.postComment(context, message, workingCommentId);
									return;
								}

								indexFile = {
									...existingIndexFile,
									filename: existingIndexFile.name,
								};

								// Determine language based on the file extension if we found a file
								if (indexFile.filename.endsWith('.js')) {
									language = 'js';
								} else if (indexFile.filename.endsWith('.ts')) {
									language = 'ts';
								}
							}

							// Fetch the contents of the spec file and index file
							const specFileContent = await github.fetchFileContents(context, specFile.sha);
							const indexFileContent = await github.fetchFileContents(context, indexFile!.sha);

							const reviewerFeedback = command.extra;
							if (!reviewerFeedback) {
								const message = `Please provide feedback or suggestions for improvement.`;
								await github.postComment(context, message, workingCommentId);
								return;
							}

							// Use the provided feedback, index file, and spec file to generate improved code
							const improvementPrompts = buildPromptForWorkerImprovement(indexFileContent, specFileContent, reviewerFeedback);
							await sendPrompt(
								env,
								{
									model,
									prompts: improvementPrompts,
									temperature,
								},
								fallback,
							).then(async ({ provider, model: fallbackModel, text, eventId }) => {
								const generatedCode = extractGeneratedCode(text);
								if (!generatedCode) {
									const elapsedTime = getElapsedSeconds(message.timestamp);
									const debugInfo = formatDebugInfo({
										elapsedTime,
										provider,
										model: fallbackModel ?? model, // Model used to generate the code
										temperature,
										eventId,
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
									language,
									prompts: {
										generateWorker: improvementPrompts.system,
									},
									eventId,
								});
							});
						}
						break;

					case CommandName.Help:
						{
							const body =
								'Available commands:\n\n- `/wall-e generate` - Generate code based on the spec file\n\n- `/wall-e improve` - Improve previously generated `index.ts` file';
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
				await endLock(env, lockId);
			}
		}
	},
};
