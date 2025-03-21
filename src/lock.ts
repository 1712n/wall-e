import { DurableObject } from 'cloudflare:workers';

export class Lock extends DurableObject {
	private running: boolean = false;

	constructor(
		private state: DurableObjectState,
		env: Env,
	) {
		super(state, env);

		this.state.blockConcurrencyWhile(async () => {
			const stored = await this.state.storage.get<boolean>('running');
			if (stored) this.running = stored;
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method.toUpperCase();
		if (method !== 'POST') {
			return new Response('Method not allowed', { status: 405 });
		}

		switch (url.pathname) {
			case '/start':
				if (this.running) {
					return new Response('Already running', { status: 409 });
				}

				this.running = true;
				await this.state.storage.put('running', true);
				return new Response('OK', { status: 200 });

			case '/finish':
				this.running = false;
				await this.state.storage.put('running', false);
				return new Response('OK', { status: 200 });

			default:
				return new Response('Not found', { status: 404 });
		}
	}
}

async function manageLock(env: Env, lockId: string, action: 'start' | 'finish') {
	const objId = env.INVOCATION_LOCK.idFromName(lockId);
	const stub = env.INVOCATION_LOCK.get(objId);
	const response = await stub.fetch(`http://invocation-lock/${action}`, { method: 'POST' });
	return response.ok;
}

export async function startLock(env: Env, lockId: string) {
	return manageLock(env, lockId, 'start');
}

export async function endLock(env: Env, lockId: string) {
	return manageLock(env, lockId, 'finish');
}
