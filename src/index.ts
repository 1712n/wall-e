import { GitHub } from './github';

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

			await github.setup(async (event, command) => {
				switch (command.name) {
					case 'hello':
						{
							const body = 'Hello from Wall-E!';
							await github.postComment(event, body);
						}
						break;

					case 'help':
						{
							const body = 'Available commands: `/wall-e hello`';
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
