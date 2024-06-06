import { Buffer } from 'node:buffer';
import { App } from '@octokit/app';
import { Octokit } from '@octokit/core';
import { EmitterWebhookEvent } from '@octokit/webhooks';

type UserCommand = {
	name: string;
	args?: string[];
};

type IssueCommentEvent = EmitterWebhookEvent<'issue_comment'>;
type InvokedActionHandler = (command: UserCommand, event: IssueCommentEvent) => Promise<void>;

type VerifyRequestParams = {
	headers: Headers;
	payload: any;
};

type GitHubOptions = {
	appId: string;
	privateKey: string;
	installationId: number;
	webhooks: {
		secret: string;
	};
};

export class GitHub {
	private app: App;
	private ready: boolean = false;
	private octokit: Promise<Octokit>;

	constructor({ appId, privateKey, installationId, webhooks }: GitHubOptions) {
		this.app = new App({
			appId: appId,
			privateKey: privateKey,
			webhooks,
		});
		this.octokit = this.app.getInstallationOctokit(installationId);
	}

	public setup(handler: InvokedActionHandler): void {
		if (this.ready) {
			throw new Error('GitHub is already setup');
		}

		this.app.webhooks.on('issue_comment', async (event) => {
			const { action, comment, issue } = event.payload;
			if (!comment.user) {
				return;
			}

			if (comment.user.type !== 'User') {
				return;
			}

			if (action === 'deleted') {
				return;
			}

			if (issue.state !== 'open') {
				return;
			}

			const ignore = !comment.body.startsWith('/wall-e');
			if (ignore) {
				return;
			}

			const parsed = comment.body.split(' ');
			if (parsed.length < 2) {
				await this.postComment(event, 'Invalid command');
			}

			const [_, name, ...args] = parsed;

			const command = {
				name: name.replace('/', ''),
				args,
			};
			await handler(command, event);
		});

		this.ready = true;
	}

	public async verifyRequest({ headers, payload }: VerifyRequestParams): Promise<Response> {
		const id = headers.get('x-github-delivery');
		const name = headers.get('x-github-event') as any;
		const signature = headers.get('x-hub-signature-256');

		if (!id) {
			throw new Error('Missing x-github-delivery header');
		}

		if (!name) {
			throw new Error('Missing x-github-event header');
		}

		if (!signature) {
			throw new Error('Missing x-hub-signature-256 header');
		}

		await this.app.webhooks.verifyAndReceive({
			id: id,
			name: name,
			signature: signature,
			payload: JSON.stringify(payload),
		});

		const response = JSON.stringify({
			ok: true,
		});
		return new Response(response, {
			headers: {
				'content-type': 'application/json',
			},
		});
	}

	public async postComment(event: IssueCommentEvent, body: string, id?: number) {
		const octokit = await this.octokit;

		let comment: { status: number; data: { id: number } };
		if (id) {
			comment = await octokit.request('PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}', {
				owner: event.payload.repository.owner.login,
				repo: event.payload.repository.name,
				comment_id: id,
				body: body,
			});
		} else {
			comment = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
				owner: event.payload.repository.owner.login,
				repo: event.payload.repository.name,
				issue_number: event.payload.issue.number,
				body: body,
			});
		}

		if (comment.status !== 200 && comment.status !== 201) {
			this.app.log.error('Failed to send comment', event);
			return -1;
		}

		return comment.data.id;
	}

	public async getIssueComments(event: IssueCommentEvent) {
		const octokit = await this.octokit;
		const result = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
			owner: event.payload.repository.owner.login,
			repo: event.payload.repository.name,
			issue_number: event.payload.issue.number,
			per_page: 100,
		});

		if (result.status !== 200) {
			this.app.log.error('Failed to get issue comments', event);
			return [];
		}

		return result.data;
	}

	public async listPullRequestFiles(event: IssueCommentEvent) {
		const octokit = await this.octokit;
		const result = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
			owner: event.payload.repository.owner.login,
			repo: event.payload.repository.name,
			pull_number: event.payload.issue.number,
		});

		if (result.status !== 200) {
			this.app.log.error('Failed to get pull request files', event);
			return [];
		}

		return result.data as { filename: string; status: string; sha: string }[];
	}

	public async fetchFileContents(event: IssueCommentEvent, sha: string) {
		const octokit = await this.octokit;
		const result = await octokit.request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', {
			owner: event.payload.repository.owner.login,
			repo: event.payload.repository.name,
			file_sha: sha,
		});

		if (result.status !== 200) {
			this.app.log.error('Failed to get file contents', event);
			return '';
		}

		return Buffer.from(result.data.content, 'base64').toString('utf8');
	}

	public async pushFileToPullRequest(event: IssueCommentEvent, file: { path: string; content: string }, commitMessage: string) {
		const octokit = await this.octokit;
		const owner = event.payload.repository.owner.login;
		const repo = event.payload.repository.name;

		const { data: pullRequest } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
			owner: owner,
			repo: repo,
			pull_number: event.payload.issue.number,
		});

		const branchName = pullRequest.head.ref;

		const { data: refData } = await octokit.request('GET /repos/{owner}/{repo}/git/ref/heads/{branch}', {
			owner: owner,
			repo: repo,
			branch: branchName,
		});

		const latestCommitSha = refData.object.sha;

		const { data: latestCommit } = await octokit.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
			owner: owner,
			repo: repo,
			commit_sha: latestCommitSha,
		});

		const baseTreeSha = latestCommit.tree.sha;

		const { data: blob } = await octokit.request('POST /repos/{owner}/{repo}/git/blobs', {
			owner: owner,
			repo: repo,
			content: file.content,
			encoding: 'utf-8',
		});

		const { data: tree } = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
			owner: owner,
			repo: repo,
			base_tree: baseTreeSha,
			tree: [
				{
					path: file.path,
					mode: '100644', // Regular file
					type: 'blob',
					sha: blob.sha,
				},
			],
		});

		const { data: newCommit } = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
			owner: owner,
			repo: repo,
			message: commitMessage,
			tree: tree.sha,
			parents: [latestCommitSha],
		});

		await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}', {
			owner: owner,
			repo: repo,
			branch: branchName,
			sha: newCommit.sha,
		});

		return newCommit;
	}
}
