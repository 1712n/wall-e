import { App } from '@octokit/app';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		switch (request.method) {
			case 'GET':
				return new Response('<h2>Nothing to see here...</h2>', {
					headers: { 'content-type': 'text/html' },
				});
		}

		const id = request.headers.get('x-github-delivery');
		const name = request.headers.get('x-github-event') as any;
		const signature = request.headers.get('x-hub-signature-256');

		if (!id || !name || !signature) {
			const response = JSON.stringify({
				error: 'Missing required headers',
				ok: false,
			});
			return new Response(response, {
				status: 400,
				headers: {
					'content-type': 'application/json',
				},
			});
		}

		const payload = await request.json<any>();
		const installationId = payload.installation.id;

		const app = new App({
			appId: env.GH_APP_ID,
			privateKey: env.GH_PRIVATE_KEY,
			webhooks: {
				secret: env.GH_WEBHOOK_SECRET,
			},
		});

		app.webhooks.on('issue_comment', async (event) => {
			const { action, comment, issue, repository } = event.payload;
			if (!comment.user) {
				return;
			}

			if (comment.user.type !== 'User') {
				return;
			}

			if (action === 'deleted') {
				return;
			}

			const isInvoked = comment.body.startsWith('/walle') === true;
			if (!isInvoked) {
				return;
			}

			const octokit = await app.getInstallationOctokit(installationId);
			const sent = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
				owner: repository.owner.login,
				repo: repository.name,
				issue_number: issue.number,
				body: `Hello @${comment.user.login}!`,
			});

			if (sent.status !== 201) {
				app.log.error('Failed to send comment', sent);
			}
		});

		try {
			await app.webhooks.verifyAndReceive({
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
		} catch (error: any) {
			app.log.error(error.message);

			const response = JSON.stringify({
				error: `Unable to verify and receive request: ${error.message}`,
				ok: false,
			});
			return new Response(response, {
				status: 400,
				headers: {
					'content-type': 'application/json',
				},
			});
		}
	},
};
