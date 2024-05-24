import { App } from '@octokit/app';
import { Octokit } from '@octokit/core';
import { EmitterWebhookEvent } from '@octokit/webhooks';

type UserCommand = {
	name: string;
	args?: string[];
};

type InvokedActionHandler = (command: UserCommand, event: EmitterWebhookEvent<'issue_comment'>) => Promise<void>;

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

	public async setup(handler: InvokedActionHandler): Promise<void> {
		if (this.ready) {
			throw new Error('GitHub is already setup');
		}

		this.app.webhooks.on('issue_comment', async (event) => {
			const { action, comment } = event.payload;
			if (!comment.user) {
				return;
			}

			if (comment.user.type !== 'User') {
				return;
			}

			if (action === 'deleted') {
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

	public async postComment(event: EmitterWebhookEvent<'issue_comment'>, body: string) {
		const octokit = await this.octokit;
		const comment = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
			owner: event.payload.repository.owner.login,
			repo: event.payload.repository.name,
			issue_number: event.payload.issue.number,
			body: body,
		});

		if (comment.status !== 201) {
			this.app.log.error('Failed to send comment', event);
			return false;
		}

		return true;
	}

	public async getIssueComments(event: EmitterWebhookEvent<'issue_comment'>) {
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

	public async listRepositoryFiles(event: EmitterWebhookEvent<'issue_comment'>, path: string = '.') {
		const octokit = await this.octokit;
		const result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
			owner: event.payload.repository.owner.login,
			repo: event.payload.repository.name,
			path: path,
		});

		if (result.status !== 200) {
			this.app.log.error('Failed to get repo contents', event);
			return [];
		}

		return result.data as { name: string; path: string; type: string; download_url: string }[];
	}
}
