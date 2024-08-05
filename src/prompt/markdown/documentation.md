# Knowledge Map

## Cloudflare Workers
- [Cloudflare Test APIs](#cloudflare-test-apis) are needed for all Cloudflare Workers, no matter what.
## Data Stores
- For any data store interactions, we need to leverage [Drizzle ORM](#drizzle-orm) for consistency and safety.
  - [Drizzle Usage with Cloudflare Workers](#drizzle-usage-with-cloudflare-workers) demonstrates how to use Drizzle ORM within Workers.
  - [Drizzle Operations](#drizzle-operations) cover various data manipulation tasks.
  - [Drizzle Vector Storage](#drizzle---vector-storage) enables storing vector embeddings alongside other data.
- Any data stores outside the Cloudflare Ecosystem need to be accessed through [Cloudflare Hyperdrive](#cloudflare-hyperdrive) to increase performance.
  - Hyperdrive is an intelligent caching layer between Cloudflare Workers and external databases.

## AI Models
- Advanced Reasoning use cases need to rely on frontier models from external LLM services, such as [GPT4o](#cloudflare-workers-ai-superior-reasoning-use-cases---meta-llama-3-llm) and [Claude Sonnet 3.5](#cloudflare-workers-ai-superior-reasoning-use-cases---meta-llama-3-llm).
- Cost-Efficient models - [Cloudflare Workers AI](#cloudflare-workers-ai) are good for simpler use cases. 
  - Cloudflare Workers AI are also great for use cases that require [text embeddings](#cloudflare-workers-ai-text-embeddings), such as similarity search.

## Additional Cloudflare Services
- [Cloudflare Vectorize](#cloudflare-vectorize) is a globally distributed vector database for building AI-powered applications.
  - Perform [Cloudflare Vectorize Operations](#cloudflare-vectorize-operations) like inserting, upserting, and querying vectors.
- [Cloudflare AI Gateway](#cloudflare-ai-gateway) is a proxy between Cloudflare Workers and various AI models and providers.
  - Offers built-in caching, logging, analytics, rate limiting, request retries, and model fallback.
- [Cloudflare Workers Cache API](#cloudflare-workers-cache-api) allows Workers to programmatically cache both internal and external fetch requests.
  - Useful for overriding content that is already cached and accessing cached responses without relying on fetch requests.

# Cloudflare
## Cloudflare Test APIs

The Workers Vitest integration provides runtime helpers for writing tests in the `cloudflare:test` module. The `cloudflare:test` module is provided by the `@cloudflare/vitest-pool-workers` package, but can only be imported from test files that execute in the Workers runtime.

### `cloudflare:test` module definition

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

## Cloudflare Workers AI

### Cloudflare Workers AI Bindings

To use Workers AI with Workers, you must create a Workers AI binding. Bindings allow your Workers to interact with resources, like Workers AI, on the Cloudflare Developer Platform.

### Cloudflare Workers Ai Type

The `Ai` type is a built-in type provided by the TypeScript compiler when using Cloudflare Workers. It is automatically available in the global scope of your worker script. Important: you don't need to explicitly import it using an import statement.
```ts
export interface Env {
  AI: Ai;
}
```

### Cloudflare Workers AI Changelog: Add AI native binding

-   Added new AI native binding, you can now run models with `const resp = await env.AI.run(modelName, inputs)`
-   Deprecated `@cloudflare/ai` npm package. While existing solutions using the @cloudflare/ai package will continue to work, no new Workers AI features will be supported. Moving to native AI bindings is highly recommended

### Cloudflare Workers AI Methods

#### async env.AI.run()

`async env.AI.run()` runs a model. Takes a model as the first parameter, and an object as the second parameter.

```javascript
const answer = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    prompt: "What is the origin of the phrase 'Hello, World'"
});
```

**Parameters**
- `model` string required - The model to run.

### Cloudflare Workers AI Models

Workers AI comes with a curated set of popular open-source models that enable you to do tasks such as image classification, text generation, object detection and more.

#### Cloudflare Workers AI Text Embeddings
Feature extraction models transform raw data into numerical features that can be processed while preserving the information in the original dataset. These models are ideal as part of building vector search applications or Retrieval Augmented Generation workflows with LLMs.

#### Cloudflare Workers AI BAAI general embedding model
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
  input: "{\n  \"type\": \"object\",\n  \"properties\": {\n    \"text\": {\n      \"oneOf\": [\n        {\n          \"type\": \"string\",\n          \"minLength\": 1\n        },\n        {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"string\",\n            \"minLength\": 1\n          },\n          \"maxItems\": 100\n        }\n      ]\n    }\n  },\n  \"required\": [\n    \"text\"\n  ]\n}"
  output: "{\n  \"type\": \"object\",\n  \"contentType\": \"application/json\",\n  \"properties\": {\n    \"shape\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"type\": \"number\"\n      }\n    },\n    \"data\": {\n      \"type\": \"array\",\n      \"items\": {\n        \"type\": \"array\",\n        \"items\": {\n          \"type\": \"number\"\n        }\n      }\n    }\n  }\n}"
```

#### Cloudflare Workers AI Text Generation

#### Scoped prompts
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

#### Cloudflare Workers AI Big Context Use Cases - Mistral-7B-Instruct-v0.2 Large Language Model (LLM)

```
model:
  id: "b97d7069-48d9-461c-80dd-445d20a632eb"
  source: 2
  name: "@hf/mistral/mistral-7b-instruct-v0.2"
  description: "The Mistral-7B-Instruct-v0.2 Large Language Model (LLM) is an instruct fine-tuned version of the Mistral-7B-v0.2. Mistral-7B-v0.2 has the following changes compared to Mistral-7B-v0.1: 32k context window (vs 8k context in v0.1), rope-theta = 1e6, and no Sliding-Window Attention."
  task:
    id: "c329a1f9-323d-4e91-b2aa-582dd4188d34"
    name: "Text Generation"
    description: "Family of generative text models, such as large language models (LLM), that can be adapted for a variety of natural language tasks."
  tags: []
  properties:
    - property_id: "beta"
      value: "true"
    - property_id: "info"
      value: "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2"
    - property_id: "lora"
      value: "true"
    - property_id: "max_batch_prefill_tokens"
      value: "8192"
    - property_id: "max_input_length"
      value: "3072"
    - property_id: "max_total_tokens"
      value: "4096"
task_type: "text-generation"
model_display_name: "mistral-7b-instruct-v0.2"
layout: "model"
weight: 0
title: "mistral-7b-instruct-v0.2"
json_schema:
  input: "{\n  \"type\": \"object\",\n  \"oneOf\": [\n    {\n      \"properties\": {\n        \"prompt\": {\n          \"type\": \"string\",\n          \"maxLength\": 4096\n        },\n        \"raw\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"stream\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"max_tokens\": {\n          \"type\": \"integer\",\n          \"default\": 256\n        }\n      },\n      \"required\": [\n        \"prompt\"\n      ]\n    },\n    {\n      \"properties\": {\n        \"messages\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"object\",\n            \"properties\": {\n              \"role\": {\n                \"type\": \"string\"\n              },\n              \"content\": {\n                \"type\": \"string\",\n                \"maxLength\": 4096\n              }\n            },\n            \"required\": [\n              \"role\",\n              \"content\"\n            ]\n          }\n        },\n        \"stream\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"max_tokens\": {\n          \"type\": \"integer\",\n          \"default\": 256\n        }\n      },\n      \"required\": [\n        \"messages\"\n      ]\n    }\n  ]\n}"
  output: "{\n  \"oneOf\": [\n    {\n      \"type\": \"object\",\n      \"contentType\": \"application/json\",\n      \"properties\": {\n        \"response\": {\n          \"type\": \"string\"\n        }\n      }\n    },\n    {\n      \"type\": \"string\",\n      \"contentType\": \"text/event-stream\",\n      \"format\": \"binary\"\n    }\n  ]\n}"
```

#### Cloudflare Workers AI Superior Reasoning Use Cases - Meta Llama 3 LLM

```
model:
  id: "e11d8f45-7b08-499a-9eeb-71d4d3c8cbf9"
  source: 1
  name: "@cf/meta/llama-3-8b-instruct"
  description: "Generation over generation, Meta Llama 3 demonstrates state-of-the-art performance on a wide range of industry benchmarks and offers new capabilities, including improved reasoning."
  task:
    id: "c329a1f9-323d-4e91-b2aa-582dd4188d34"
    name: "Text Generation"
    description: "Family of generative text models, such as large language models (LLM), that can be adapted for a variety of natural language tasks."
  tags: []
  properties:
    - property_id: "beta"
      value: "true"
    - property_id: "info"
      value: "https://llama.meta.com"
    - property_id: "terms"
      value: "https://llama.meta.com/llama3/license/#"
task_type: "text-generation"
model_display_name: "llama-3-8b-instruct"
layout: "model"
weight: 0
title: "llama-3-8b-instruct"
json_schema:
  input: "{\n  \"type\": \"object\",\n  \"oneOf\": [\n    {\n      \"properties\": {\n        \"prompt\": {\n          \"type\": \"string\",\n          \"maxLength\": 4096\n        },\n        \"raw\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"stream\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"max_tokens\": {\n          \"type\": \"integer\",\n          \"default\": 256\n        }\n      },\n      \"required\": [\n        \"prompt\"\n      ]\n    },\n    {\n      \"properties\": {\n        \"messages\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"object\",\n            \"properties\": {\n              \"role\": {\n                \"type\": \"string\"\n              },\n              \"content\": {\n                \"type\": \"string\",\n                \"maxLength\": 4096\n              }\n            },\n            \"required\": [\n              \"role\",\n              \"content\"\n            ]\n          }\n        },\n        \"stream\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"max_tokens\": {\n          \"type\": \"integer\",\n          \"default\": 256\n        }\n      },\n      \"required\": [\n        \"messages\"\n      ]\n    }\n  ]\n}"
  output: "{\n  \"oneOf\": [\n    {\n      \"type\": \"object\",\n      \"contentType\": \"application/json\",\n      \"properties\": {\n        \"response\": {\n          \"type\": \"string\"\n        }\n      }\n    },\n    {\n      \"type\": \"string\",\n      \"contentType\": \"text/event-stream\",\n      \"format\": \"binary\"\n    }\n  ]\n}"
```

## Cloudflare Vectorize

Vectorize is a globally distributed vector database that enables you to build full-stack, AI-powered applications with Cloudflare Workers. Vectorize makes querying embeddings faster and easier. By storing the embeddings generated by a machine learning model, including those built-in to Workers AI or by bringing your own from platforms like OpenAI, you can build applications with powerful search, similarity, recommendation, classification and/or anomaly detection capabilities based on your own data.

### Cloudflare Vectorize Vectors

A vector represents the vector embedding output from a machine learning model.

- `id` - a unique `string` identifying the vector in the index. This should map back to the ID of the document, object or database identifier that the vector values were generated from.
- `namespace` - an optional partition key within a index. Operations are performed per-namespace, so this can be used to create isolated segments within a larger index.
- `values` - an array of `number`, `Float32Array`, or `Float64Array` as the vector embedding itself. This must be a dense array, and the length of this array must match the `dimensions` configured on the index.
- `metadata` - an optional set of key-value pairs that can be used to store additional metadata alongside a vector.

```ts
let vectorExample = {
    id: "12345",
    values: [32.4, 6.55, 11.2, 10.3, 87.9],
    metadata: {
        "key": "value",
        "hello": "world",
        "url": "r2://bucket/some/object.json"
    }
}
```

### Cloudflare Vectorize Operations

#### Cloudflare Vectorize - Insert vectors

```ts
let vectorsToInsert = [
    {id: "123", values: [32.4, 6.5, 11.2, 10.3, 87.9]},
    {id: "456", values: [2.5, 7.8, 9.1, 76.9, 8.5]},
]
let inserted = await env.YOUR_INDEX.insert(vectorsToInsert)
```

Inserts vectors into the index. Returns the count of vectors inserted and their IDs.

If vectors with the same vector ID already exist in the index, only the vectors with new IDs will be inserted. The returned `VectorizeVectorMutation` will return a `count` and an `ids` array with IDs of the vectors inserted into the index, and omit IDs that already exist in the index.

If you need to update existing vectors, use the [upsert](#upsert-vectors) operation.

#### Cloudflare Vectorize - Upsert vectors

```ts
let vectorsToUpsert = [
    {id: "123", values: [32.4, 6.5, 11.2, 10.3, 87.9]},
    {id: "456", values: [2.5, 7.8, 9.1, 76.9, 8.5]},
    {id: "768", values: [29.1, 5.7, 12.9, 15.4, 1.1]}
]
let upserted = await env.YOUR_INDEX.upsert(vectorsToUpsert)
```

Upserts vectors into an index. Returns the count of vectors upserted and their IDs.

An upsert operation will insert vectors into the index if vectors with the same ID do not exist, and overwrite vectors with the same ID.

Upserting does not merge or combine the values or metadata of an existing vector with the upserted vector: the upserted vector replaces the existing vector in full.

#### Cloudflare Vectorize - Query vectors

```ts
let queryVector = [32.4, 6.55, 11.2, 10.3, 87.9]
let matches = await env.YOUR_INDEX.query(queryVector)
```

Query an index with the provided vector, returning the score(s) of the closest vectors based on the configured distance metric.

* Configure the number of returned matches by setting `topK` (default: 3)
* Return vector values by setting `returnValues: true` (default: false)
* Return vector metadata by setting `returnMetadata: true` (default: false)

```ts
let matches = await env.YOUR_INDEX.query(queryVector, { topK: 5, returnValues: true, returnMetadata: true })
```

Retrieves the specified vectors by their ID, including values and metadata.

### Cloudflare Vectorize - Binding to a Worker

Bindings allow you to attach resources, including Vectorize indexes, to your Worker. In the Env, it's defined as:
```ts
export interface Env {
  VECTORIZE_INDEX: VectorizeIndex;
}
```

## Cloudflare Hyperdrive

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

## Cloudflare AI Gateway
Cloudflare's AI Gateway is a proxy between your Cloudflare Worker and Cloudflare Workers' AI models, as well as other popular providers such as Anthropic and OpenAI. It offers built-in caching, logging, an analytics dashboard, rate limiting, request retries, and model fallback.

### Cloudflare AI Gateway - Caching
#### Cloudflare AI Gateway Cache TTL (cf-cache-ttl)
Set the caching duration in milliseconds. Example:
```bash
curl https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai/chat/completions \
  --header 'Authorization: Bearer $TOKEN' \
  --header 'Content-Type: application/json' \
  --header 'cf-cache-ttl: 3600000' \
  --data '{
     "model": "gpt-3.5-turbo",
     "messages": [
       {
         "role": "user",
         "content": "how to build a wooden spoon in 3 short steps? give as short as answer as possible"
       }
     ]
   }'
```
#### Cloudflare AI Gateway - Custom Cache Key (cf-aig-cache-key)
Custom cache keys let you override the default cache key in order to precisely set the cacheability setting for any resource. When you use the cf-aig-cache-key header for the first time, you will receive a response from the provider. Subsequent requests with the same header will return the cached response. If the cf-cache-ttl header is used, responses will be cached according to the specified Cache Time To Live. Otherwise, responses will be cached according to the cache settings in the dashboard. If caching is not enabled for the gateway, responses will be cached for 5 minutes by default.
```bash
curl https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai/chat/completions \
  --header 'Authorization: Bearer {openai_token}' \
  --header 'Content-Type: application/json' \
  --header 'cf-aig-cache-key: responseA' \
  --data ' {
    "model": "gpt-3.5-turbo",
    "messages": [
    {
    "role": "user",
    "content": "how to build a wooden spoon in 3 short steps? give as short as answer as possible"
    }
    ]
    }
'
```
#### Cloudflare AI Gateway - Caching Workers AI
To use AI Gateway's caching within a Worker, include the gateway configuration as an object in the Workers AI request options.
```ts
const response = await env.AI.run(
      "@cf/meta/llama-3-8b-instruct",
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

## Cloudflare Workers Cache API
Cloudflare Workers Cache API is a service that allows Workers to programmatically cache both internal and external fetch requests, including `POST` requests that can't be cached automatically by Cloudflare network.
The Cache API can be thought of as an ephemeral key-value store, whereby the `Request` object (or more specifically, the request URL) is the key, and the `Response` is the value.

There are two types of cache namespaces available to the Cloudflare Cache:
- **`caches.default`** – You can access the default cache (the same cache shared with `fetch` requests) by accessing `caches.default`. This is useful when needing to override content that is already cached, after receiving the response.
- **`caches.open()`** – You can access a namespaced cache (separate from the cache shared with `fetch` requests) using `let cache = await caches.open(CACHE_NAME)`. Note that caches.open is an async function, unlike `caches.default`.

When to use the Cache API:
- When you want to programmatically save and/or delete responses from a cache. For example, say an origin is responding with a `Cache-Control: max-age:0` header and cannot be changed. Instead, you can clone the `Response`, adjust the header to the `max-age=3600` value, and then use the Cache API to save the modified `Response` for an hour.
- When you want to programmatically access a Response from a cache without relying on a `fetch` request. For example, you can check to see if you have already cached a `Response` for the `https://example.com/slow-response` endpoint. If so, you can avoid the slow request.
### Using the Cache API
```ts
interface Env {}
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const cacheUrl = new URL(request.url);

    // Construct the cache key from the cache URL
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;

    // Check whether the value is already available in the cache
    // if not, you will need to fetch it from origin, and store it in the cache
    let response = await cache.match(cacheKey);

    if (!response) {
      console.log(
        `Response for request url: ${request.url} not present in cache. Fetching and caching request.`
      );
      // If not in cache, get it from origin
      response = await fetch(request);

      // Must use Response constructor to inherit all of response's fields
      response = new Response(response.body, response);

      // Cache API respects Cache-Control headers. Setting s-max-age to 10
      // will limit the response to be in cache for 10 seconds max

      // Any changes made to the response here will be reflected in the cached value
      response.headers.append("Cache-Control", "s-maxage=10");

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    } else {
      console.log(`Cache hit for: ${request.url}.`);
    }
    return response;
  },
} satisfies ExportedHandler<Env>;
```
### Cache POST requests
```ts
interface Env {}
export default {
  async fetch(request, env, ctx): Promise<Response> {
    async function sha256(message) {
      // encode as UTF-8
      const msgBuffer = await new TextEncoder().encode(message);
      // hash the message
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      // convert bytes to hex string
      return [...new Uint8Array(hashBuffer)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    try {
      if (request.method.toUpperCase() === "POST") {
        const body = await request.clone().text();
        // Hash the request body to use it as a part of the cache key
        const hash = await sha256(body);
        const cacheUrl = new URL(request.url);
        // Store the URL in cache by prepending the body's hash
        cacheUrl.pathname = "/posts" + cacheUrl.pathname + hash;
        // Convert to a GET to be able to cache
        const cacheKey = new Request(cacheUrl.toString(), {
          headers: request.headers,
          method: "GET",
        });

        const cache = caches.default;
        // Find the cache key in the cache
        let response = await cache.match(cacheKey);
        // Otherwise, fetch response to POST request from origin
        if (!response) {
          response = await fetch(request);
          ctx.waitUntil(cache.put(cacheKey, response.clone()));
        }
        return response;
      }
      return fetch(request);
    } catch (e) {
      return new Response("Error thrown " + e.message);
    }
  },
} satisfies ExportedHandler<Env>;
```

# Drizzle ORM

Drizzle ORM is a lightweight, type-safe SQL query builder and ORM (Object-Relational Mapping) for TypeScript and JavaScript.

## Drizzle Usage with Cloudflare Workers

```ts
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const client = new Client({ connectionString: env.DATABASE_URL });
    await client.connect();
    const db = drizzle(client);
    const result = await db.select().from(...);
    // Clean up the client, ensuring we don't kill the worker before that is completed.
    ctx.waitUntil(client.end());
    return new Response(now);
  }
}
```
## Drizzle Operations
### Drizzle - Update many with different values for each row

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

### Drizzle - Using table columns

Tables are defined in the schema using pgTable() calls. For example:

```ts
import { pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name'),
  phone: varchar('phone', { length: 256 }),
});
```

### Drizzle - Using Drizzle Queries

Relational queries are an extension to the existing schema definition and query builder. To use this API, all tables and relations from the schema file/files upon drizzle() initialization should be provided.

```ts
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/...';

const db = drizzle(client, { schema });
await db.query.users.findMany();
```

#### Drizzle - Filtering and Conditions

The relational queries API enables the definition of filters and conditions using Drizzle's operators. When referencing table columns in operators, the tables exported from the schema are used:

```ts
const users = await db.query.users.findMany({
  where: eq(schema.users.id, 1)
})
```

## Drizzle - Vector storage

Store your vectors with the rest of your data with column type `vector`:

```ts
const table = pgTable('table', { 
   embedding: vector('embedding', { dimensions: 3 })
})
```
