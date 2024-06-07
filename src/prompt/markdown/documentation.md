## Test APIs

The Workers Vitest integration provides runtime helpers for writing tests in the `cloudflare:test` module. The `cloudflare:test` module is provided by the `@cloudflare/vitest-pool-workers` package, but can only be imported from test files that execute in the Workers runtime.

### `cloudflare:test` module definition

- env: import("cloudflare:test").ProvidedEnv

  - Exposes the [`env` object](/workers/runtime-apis/handlers/fetch/#parameters) for use as the second argument passed to ES modules format exported handlers. This provides access to [bindings](/workers/runtime-apis/bindings/) that you have defined in your [Vitest configuration file](/workers/testing/vitest-integration/configuration/).

    ```ts
    import { env } from 'cloudflare:test';

    it('uses binding', async () => {
    	await env.KV_NAMESPACE.put('key', 'value');
    	expect(await env.KV_NAMESPACE.get('key')).toBe('value');
    });
    ```

    To configure the type of this value, use an ambient module type:

    ```ts
    declare module 'cloudflare:test' {
    	interface ProvidedEnv {
    		KV_NAMESPACE: KVNamespace;
    	}
    	// ...or if you have an existing `Env` type...
    	interface ProvidedEnv extends Env {}
    }
    ```

- SELF: Fetcher

  - [Service binding](/workers/runtime-apis/bindings/service-bindings/) to the default export defined in the `main` Worker. Use this to write integration tests against your Worker. The `main` Worker runs in the same isolate/context as tests so any global mocks will apply to it too.

    ```ts
    import { SELF } from "cloudflare:test";

    it("dispatches fetch event", async () => {
      const response = await SELF.fetch("https://example.com");
      expect(await response.text()).toMatchInlineSnapshot(...);
    });
    ```

- fetchMock: import("undici").MockAgent

  - Declarative interface for mocking outbound `fetch()` requests. Deactivated by default and reset before running each test file. Refer to [`undici`'s `MockAgent` documentation](https://undici.nodejs.org/#/docs/api/MockAgent) for more information. Note this only mocks `fetch()` requests for the current test runner Worker. Auxiliary Workers should mock `fetch()`es using the Miniflare `fetchMock`/`outboundService` options. Refer to [Configuration](/workers/testing/vitest-integration/configuration/#workerspooloptions) for more information.

    ```ts
    import { fetchMock } from 'cloudflare:test';
    import { beforeAll, afterEach, it, expect } from 'vitest';

    beforeAll(() => {
    	// Enable outbound request mocking...
    	fetchMock.activate();
    	// ...and throw errors if an outbound request isn't mocked
    	fetchMock.disableNetConnect();
    });
    // Ensure we matched every mock we defined
    afterEach(() => fetchMock.assertNoPendingInterceptors());

    it('mocks requests', async () => {
    	// Mock the first request to `https://example.com`
    	fetchMock.get('https://example.com').intercept({ path: '/' }).reply(200, 'body');

    	const response = await fetch('https://example.com/');
    	expect(await response.text()).toBe('body');
    });
    ```
