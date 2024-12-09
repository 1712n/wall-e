### Cloudflare Workers
- [Cloudflare Test APIs](#cloudflare-test-apis) are required for all Cloudflare Workers. 

### Data Management
#### Persistent Storage
- [Drizzle ORM](#drizzle-orm) for all data store interactions
  - [Usage with Cloudflare Workers](#drizzle-usage-with-cloudflare-workers)
  - [Drizzle Operations](#drizzle-operations) cover various data manipulation tasks.
  - [Request batching](#drizzle---request-batching-examples) is important for optimizing DB resource usage.
  - Supports [vector storage](#drizzle---vector-storage) and [vector similarity search](#vector-similarity-search)
- [Cloudflare Hyperdrive](#cloudflare-hyperdrive) for any data stores outside the Cloudflare Ecosystem to improve performance
  - Intelligent caching layer between Workers and external databases

### AI Models
- Advanced Reasoning use cases need to rely on frontier models from external LLM services, such as GPT4o and Claude Sonnet 3.5.
- Cost-Efficient Models: [Cloudflare Workers AI](#cloudflare-workers-ai)
  - Good for simpler use cases
  - Includes [text embedding models](#cloudflare-workers-ai-text-embeddings) for vector similarity search
- [Batch APIs from OpenAI](#openai-batch-api), Google, and Anthropic are perfect for non-latency sensitive use cases.

### Requests Optimization
- [Cloudflare AI Gateway](#cloudflare-ai-gateway) is a proxy between Cloudflare Workers and various AI models and providers.
  - Offers built-in caching, logging, analytics, rate limiting, request retries, and model fallback.
- [Cloudflare Workers Cache API](#cloudflare-workers-cache-api) allows Workers to programmatically cache both internal and external fetch requests.
  - Useful for overriding content that is already cached and accessing cached responses without relying on fetch requests.

## Cloudflare
### Cloudflare Test APIs

The Workers Vitest integration provides runtime helpers for writing tests in the `cloudflare:test` module. The `cloudflare:test` module is provided by the `@cloudflare/vitest-pool-workers` package, but can only be imported from test files that execute in the Workers runtime.

#### `cloudflare:test` module definition

- env: import("cloudflare:test").ProvidedEnv

  - Exposes the `env` object for use as the second argument passed to ES modules format exported handlers. This provides access to bindings that you have defined in your Vitest configuration file.

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

  - Service binding to the default export defined in the `main` Worker. Use this to write integration tests against your Worker. The `main` Worker runs in the same isolate/context as tests so any global mocks will apply to it too.

    ```ts
    import { SELF } from "cloudflare:test";

    it("dispatches fetch event", async () => {
      const response = await SELF.fetch("https://example.com");
      expect(await response.text()).toMatchInlineSnapshot(...);
    });
    ```

- fetchMock: import("undici").MockAgent

  - Declarative interface for mocking outbound `fetch()` requests. Deactivated by default and reset before running each test file. Note this only mocks `fetch()` requests for the current test runner Worker. Auxiliary Workers should mock `fetch()`es using the Miniflare `fetchMock`/`outboundService` options.

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

### Cloudflare Workers AI

#### Cloudflare Workers AI Bindings

To use Workers AI with Workers, you must create a Workers AI binding. Bindings allow your Workers to interact with resources, like Workers AI, on the Cloudflare Developer Platform.

#### Cloudflare Workers Ai Type

The `Ai` type is a built-in type provided by the TypeScript compiler when using Cloudflare Workers. It is automatically available in the global scope of your worker script. Important: you don't need to explicitly import it using an import statement.
```ts
export interface Env {
  AI: Ai;
}
```

#### Cloudflare Workers AI Changelog: Add AI native binding

- Added new AI native binding, you can now run models with `const resp = await env.AI.run(modelName, inputs)`
- Deprecated `@cloudflare/ai` npm package. While existing solutions using the @cloudflare/ai package will continue to work, no new Workers AI features will be supported. Moving to native AI bindings is highly recommended

#### Cloudflare Workers AI Methods

##### async env.AI.run()

`async env.AI.run()` runs a model. Takes a model as the first parameter, and an object as the second parameter.

```javascript
const answer = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    prompt: "What is the origin of the phrase 'Hello, World'"
});
```

**Parameters**
- `model` string required - The model to run.

#### Cloudflare Workers AI Models

Workers AI comes with a curated set of popular open-source models that enable you to do tasks such as image classification, text generation, object detection and more.

##### Cloudflare Workers AI Text Embeddings
Feature extraction models transform raw data into numerical features that can be processed while preserving the information in the original dataset. These models are ideal as part of building vector search applications or Retrieval Augmented Generation workflows with LLMs.

##### Cloudflare Workers AI BAAI general embedding model
```
model:
  id: "429b9e8b-d99e-44de-91ad-706cf8183658"
  source: 1
  name: "@cf/baai/bge-base-en-v1.5"
  description: "BAAI general embedding (bge) models transform any given text into a compact vector"
  task:
    id: "0137cdcf-162a-4108-94f2-1ca59e8c65ee"
    name: "Text Embeddings"
    description: "Feature extraction models transform raw data into numerical features that can be processed while preserving the information in the original dataset. These models are ideal as part of building vector search applications or Retrieval Augmented Generation workflows with Large Language Models (LLM)."
  tags: []
  properties:
    - property_id: "beta"
      value: "false"
    - property_id: "info"
      value: "https://huggingface.co/BAAI/bge-base-en-v1.5"
    - property_id: "max_input_tokens"
      value: "512"
    - property_id: "output_dimensions"
      value: "768"
task_type: "text-embeddings"
model_display_name: "bge-base-en-v1.5"
layout: "model"
weight: 100
title: "bge-base-en-v1.5"
json_schema:
  input: "{\n  \"type\": \"object\",\n  \"properties\": {\n    \"text\": {\n      \"oneOf\": [\n        {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"string\",\n            \"minLength\": 1\n          },\n          \"maxItems\": 100\n        }\n      ]\n    }\n  },\n  \"required\": [\n    \"text\"\n  ]\n}"
  output: "{\n  \"type\": \"object\",\n  \"contentType\": \"application/json\",\n  \"properties\": {\n    \"shape\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"type\": \"number\"\n      }\n    },\n    \"data\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"type\": \"array\",\n        \"items\": {\n          \"type\": \"number\"\n        }\n      }\n    }\n  }\n}"
```

##### Cloudflare Workers AI Text Generation

##### Scoped prompts
This is the recommended method. With scoped prompts, Workers AI takes the burden of knowing and using different chat templates for different models and provides a unified interface to developers when building prompts and creating text generation tasks.

Scoped prompts are a list of messages. Each message defines two keys: the role and the content.

Typically, the role can be one of three options:

`system` - System messages define the AI’s personality. You can use them to set rules and how you expect the AI to behave.
`user` - User messages are where you actually query the AI by providing a question or a conversation.
assistant - Assistant messages hint to the AI about the desired output format. Not all models support this role.
Even though chat templates are flexible, other text generation models tend to follow the same conventions.

Here’s an input example of a scoped prompt using system and user roles:
```
{
  messages: [
    { role: "system", content: "you are a very funny comedian and you like emojis" },
    { role: "user", content: "tell me a joke about cloudflare" },
  ],
};
```
Note that different LLMs are trained with different templates for different use cases. While Workers AI tries its best to abstract the specifics of each LLM template from the developer through a unified API, you should always refer to the model documentation for details. For example, instruct models like Codellama are fine-tuned to respond to a user-provided instruction, while chat models expect fragments of dialogs as input.

##### Cloudflare Workers AI Low-Latency Use Cases - llama-3.1-8b-instruct-fast

```ts
export interface Env {
  AI: Ai;
}

export default {
  async fetch(request, env): Promise<Response> {

    const messages = [
      { role: "system", content: "You are a friendly assistant" },
      {
        role: "user",
        content: "What is the origin of the phrase Hello, World",
      },
    ];

    const stream = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages,
      stream: true,
    });

    return new Response(stream, {
      headers: { "content-type": "text/event-stream" },
    });
  },
} satisfies ExportedHandler<Env>;
```

### Cloudflare Hyperdrive

Cloudflare Hyperdrive is an intelligent caching layer between Cloudflare Workers and databases outside Cloudflare Network, significantly reducing query latency and improving overall application responsiveness. By caching frequently accessed data and query results, Hyperdrive minimizes the need for repeated round-trips to the origin database, resulting in faster response times and reduced load on the database server. It's particularly beneficial for applications using Object-Relational Mapping (ORM) tools, as it can automatically optimize and cache complex queries generated by these ORMs without requiring changes to the application code.

Example Worker, which passes the connection string generated from env.HYPERDRIVE.connectionString directly to the node-postgres driver.

```ts
import { Client } from 'pg';

export interface Env {
  // If you set another name in wrangler.toml as the value for 'binding',
  // replace "HYPERDRIVE" with the variable name you defined.
  HYPERDRIVE: Hyperdrive;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    console.log(JSON.stringify(env))
    // Create a database client that connects to our database via Hyperdrive
    // Hyperdrive generates a unique connection string you can pass to
    // supported drivers, including node-postgres, Postgres.js, and the many
    // ORMs and query builders that use these drivers.
    const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });

    try {
      // Connect to our database
      await client.connect();

      // Test query
      const result = await client.query({ text: 'SELECT * FROM pg_tables' });

      // Returns result rows as JSON
      return Response.json({ result: result });
    } catch (e) {
      console.log(e);
      return Response.json({ error: e.message }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
```

### Cloudflare AI Gateway
Cloudflare's AI Gateway is a proxy between your Cloudflare Worker and Cloudflare Workers' AI models, as well as other popular providers such as Anthropic and OpenAI. It offers built-in caching, logging, an analytics dashboard, rate limiting, request retries, and model fallback.

##### Cloudflare AI Gateway - Caching Workers AI
To use AI Gateway's caching within a Worker, include the gateway configuration as an object in the Workers AI request options.

```ts
const response = await env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct-fast",
      {
        prompt: "Why should you use Cloudflare for your AI inference?"
      },
      {
        gateway: {
          id: "{gateway_id}",
          skipCache: false,
          cacheTtl: 3360
        }
      }
    );
```

### Cloudflare Browser Rendering
Cloudflare's Browser Rendering API allows to perform browser-like tasks in a Worker. It uses a fork of the popular Puppeteer library.

```typescript
import puppeteer from "@cloudflare/puppeteer";

interface Env {
  MYBROWSER: Fetcher;
}

export default {
  async fetch(request, env): Promise<Response> {
    const browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();
    await page.goto("https://example.com");
    const metrics = await page.metrics();
    await browser.close();
    return Response.json(metrics);
  },
} satisfies ExportedHandler<Env>;
```

## OpenAI Batch API

Use OpenAI's Batch API to send asynchronous groups of requests with 50% lower costs, a separate pool of significantly higher rate limits, and up to 24 hours of turnaround time. The Batch API can currently be used to execute queries against gpt-4o and gpt-4o-mini models.

### OpenAI Batch API - Preparing Batch File
Batches start with a .jsonl file where each line contains the details of an individual request to the API. For now, the available endpoints are /v1/chat/completions (Chat Completions API) and /v1/embeddings (Embeddings API). For a given input file, the parameters in each line's body field are the same as the parameters for the underlying endpoint. Each request must include a unique custom_id value, which you can use to reference results after completion. Here's an example of an input file with 2 requests. Note that each input file can only include requests to a single model.

```json
{"custom_id": "request-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-4o", "messages": [{"role": "system", "content": "You are a helpful assistant."},{"role": "user", "content": "Hello world!"}],"max_tokens": 1000}}
{"custom_id": "request-2", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-4o", "messages": [{"role": "system", "content": "You are an unhelpful assistant."},{"role": "user", "content": "Hello world!"}],"max_tokens": 1000}}
```

### OpenAI Batch API - Uploading Batch Input File
You must first upload your input file so that you can reference it correctly when kicking off batches. Upload your .jsonl file using the Files API.

```ts
import fs from "fs";
import OpenAI from "openai";
const openai = new OpenAI();
async function main() {
  const file = await openai.files.create({
    file: fs.createReadStream("batchinput.jsonl"),
    purpose: "batch",
  })}
```

### OpenAI Batch API - Creating the Batch

Once you've successfully uploaded your input file, you can use the input File object's ID to create a batch. In this case, let's assume the file ID is file-abc123. For now, the completion window can only be set to 24h. You can also provide custom metadata via an optional metadata parameter.

```ts
import OpenAI from "openai";
const openai = new OpenAI();
async function main() {
  const batch = await openai.batches.create({
    input_file_id: "file-abc123",
    endpoint: "/v1/chat/completions",
    completion_window: "24h"
  })}
```

This request will return a Batch object with metadata about your batch:

```json
{
  "id": "batch_abc123",
  "object": "batch",
  "endpoint": "/v1/chat/completions",
  "errors": null,
  "input_file_id": "file-abc123",
  "completion_window": "24h",
  "status": "validating",
  "output_file_id": null,
  "error_file_id": null,
  "created_at": 1714508499,
  "in_progress_at": null,
  "expires_at": 1714536634,
  "completed_at": null,
  "failed_at": null,
  "expired_at": null,
  "request_counts": {
    "total": 0,
    "completed": 0,
    "failed": 0
  },
  "metadata": null
}
```

### OpenAI Batch API - Checking the Status of a Batch

You can check the status of a batch at any time, which will also return a Batch object.

```ts
import OpenAI from "openai";
const openai = new OpenAI();
async function main() {const batch = await openai.batches.retrieve("batch_abc123")}
```

The status of a given Batch object can be any of the following:

Status	Description
validating	the input file is being validated before the batch can begin
failed	the input file has failed the validation process
in_progress	the input file was successfully validated and the batch is currently being run
finalizing	the batch has completed and the results are being prepared
completed	the batch has been completed and the results are ready
expired	the batch was not able to be completed within the 24-hour time window
cancelling	the batch is being cancelled (may take up to 10 minutes)
cancelled	the batch was cancelled

### OpenAI Batch API - Retrieving the Results

Once the batch is complete, you can download the output by making a request against the Files API via the output_file_id field from the Batch object and writing it to a file on your machine, in this case batch_output.jsonl

```ts
import OpenAI from "openai";
const openai = new OpenAI();
async function main() {
  const fileResponse = await openai.files.content("file-xyz123");
  const fileContents = await fileResponse.text()
}
```

The output .jsonl file will have one response line for every successful request line in the input file. Any failed requests in the batch will have their error information written to an error file that can be found via the batch's error_file_id. Note that the output line order may not match the input line order. Instead of relying on order to process your results, use the custom_id field which will be present in each line of your output file and allow you to map requests in your input to results in your output.

```json
{"id": "batch_req_123", "custom_id": "request-2", "response": {"status_code": 200, "request_id": "req_123", "body": {"id": "chatcmpl-123", "object": "chat.completion", "created": 1711652795, "model": "gpt-4o", "choices": [{"index": 0, "message": {"role": "assistant", "content": "Hello."}, "logprobs": null, "finish_reason": "stop"}], "usage": {"prompt_tokens": 22, "completion_tokens": 2, "total_tokens": 24}, "system_fingerprint": "fp_123"}}, "error": null}
{"id": "batch_req_456", "custom_id": "request-1", "response": {"status_code": 200, "request_id": "req_789", "body": {"id": "chatcmpl-abc", "object": "chat.completion", "created": 1711652789, "model": "gpt-4o", "choices": [{"index": 0, "message": {"role": "assistant", "content": "Hello! How can I assist you today?"}, "logprobs": null, "finish_reason": "stop"}], "usage": {"prompt_tokens": 20, "completion_tokens": 9, "total_tokens": 29}, "system_fingerprint": "fp_3ba"}}, "error": null}
```

## Drizzle ORM

Drizzle ORM is a lightweight, type-safe SQL query builder and ORM (Object-Relational Mapping) for TypeScript and JavaScript.

### Drizzle Usage with Cloudflare Workers

```ts
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "./schema";
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
    await client.connect();
    const db = drizzle(client, { schema: { users }, logger: false } );
    const result = await db.select().from(...);
    // Clean up the client, ensuring we don't kill the worker before that is completed.
    ctx.waitUntil(client.end());
    return new Response(now);
  }
}
```
### Drizzle Operations
#### Drizzle filters
Drizzle provides various filter and conditional operators to handle database queries. Here's an overview of the key operators and how they're used. 

```js
import { eq, gt, gte, lt, lte, exists, isNull, inArray, between, notBetween, like, ilike, notIlike, not, and, or } from 'drizzle-orm';
import { users } from './schema';

const db = drizzle(...);

await db.select()
	.from(users)
	.where(
		and(
			eq(users.age, 25),
			gt(users.age, 18),
			gte(users.age, 21),
			lt(users.age, 65),
			lte(users.age, 60),
			exists(db.select().from('other_table')),
			isNull(users.status),
			inArray(users.id, [1, 2, 3, 4]),
			between(users.age, 25, 45),
			notBetween(users.age, 0, 17),
			not(eq(users.status, 'deleted')),
			or(eq(users.status, 'active'), eq(users.status, 'pending')),
			like(users.name, '%john%'),
			ilike(users.name, '%SMITH%'), // Case insensitive (PostgreSQL only)
			notIlike(users.name, '%banned%')
		)
	);
```
#### Drizzle - Request Batching Examples
##### Batch Select
```typescript
import { and, or, inArray } from 'drizzle-orm';

const result = await db
  .select()
  .from(users)
  .where(
    and(
      inArray(users.status, ['active', 'pending']),
      or(
        inArray(users.role, ['admin', 'moderator']),
        inArray(users.id, specificUserIds)
      )
    )
  );
```
##### Batch Insert
```typescript
const usersData = [
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' },
  { name: 'Bob', email: 'bob@example.com' }
];

// Insert all users in a single query
const result = await db
  .insert(users)
  .values(usersData);
```
##### Batch Insert with Return Values
```typescript
const insertedUsers = await db
  .insert(users)
  .values(usersData)
  .returning({
    id: users.id,
    name: users.name
  });
```

##### Batch Update with different values for each row

To implement update many with different values for each row within 1 request you can use sql operator with case statement and .update().set() methods like this:

```ts
import { SQL, inArray, sql } from 'drizzle-orm';
import { users } from './schema';
const db = drizzle(...);
const inputs = [
  {
    id: 1,
    city: 'New York',
  },
  {
    id: 2,
    city: 'Los Angeles',
  },
  {
    id: 3,
    city: 'Chicago',
  },
];
// You have to be sure that inputs array is not empty
if (inputs.length === 0) {
  return;
}
const sqlChunks: SQL[] = [];
const ids: number[] = [];
sqlChunks.push(sql`(case`);
for (const input of inputs) {
  sqlChunks.push(sql`when ${users.id} = ${input.id} then ${input.city}`);
  ids.push(input.id);
}
sqlChunks.push(sql`end)`);
const finalSql: SQL = sql.join(sqlChunks, sql.raw(' '));
await db.update(users).set({ city: finalSql }).where(inArray(users.id, ids));
```

### Drizzle - Vectors
#### Vector Storage
Store your vectors with the rest of your data with column type `vector`:

```ts
const table = pgTable('table', { 
   embedding: vector('embedding', { dimensions: 3 })
})
```

#### Vector Similarity Search
To perform vector similarity search, you can use gt and sql operators with cosineDistance function to calculate the similarity between the embedding column and the generated embedding:
```ts
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { generateEmbedding } from './embedding';
import { guides } from './schema';

const db = drizzle(...);

const findSimilarGuides = async (description: string) => {
  const embedding = await generateEmbedding(description);

  const similarity = sql<number>`1 - (${cosineDistance(guides.embedding, embedding)})`;

  const similarGuides = await db
    .select({ name: guides.title, url: guides.url, similarity })
    .from(guides)
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(4);

  return similarGuides;
};
```
