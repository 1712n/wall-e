## Test APIs

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

## Workers AI

### Workers AI Bindings

To use Workers AI with Workers, you must create a Workers AI binding. Bindings allow your Workers to interact with resources, like Workers AI, on the Cloudflare Developer Platform. 

### Cloudflare Workers Ai Type

The `Ai` type is a built-in type provided by the TypeScript compiler when using Cloudflare Workers. It is automatically available in the global scope of your worker script. Important: you don't need to explicitly import it using an import statement.
```ts
export interface Env {
  AI: Ai;
}
```

### Changelog: Add AI native binding

-   Added new AI native binding, you can now run models with `const resp = await env.AI.run(modelName, inputs)`
-   Deprecated `@cloudflare/ai` npm package. While existing solutions using the @cloudflare/ai package will continue to work, no new Workers AI features will be supported. Moving to native AI bindings is highly recommended

### Methods

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

#### Text Embeddings
Feature extraction models transform raw data into numerical features that can be processed while preserving the information in the original dataset. These models are ideal as part of building vector search applications or Retrieval Augmented Generation workflows with LLMs.

#### BAAI general embedding model

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

#### Text Generation

#### Prompting
Part of getting good results from text generation models is asking questions correctly. LLMs are usually trained with specific predefined templates, which should then be used with the model’s tokenizer for better results when doing inference tasks.

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

#### Big Context Use Cases - Mistral-7B-Instruct-v0.2 Large Language Model (LLM)

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
  input: "{\n  \"type\": \"object\",\n  \"oneOf\": [\n    {\n      \"properties\": {\n        \"prompt\": {\n          \"type\": \"string\",\n          \"maxLength\": 4096\n        },\n        \"raw\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"stream\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"max_tokens\": {\n          \"type\": \"integer\",\n          \"default\": 256\n        }\n      },\n      \"required\": [\n        \"prompt\"\n      ]\n    },\n    {\n      \"properties\": {\n        \"messages\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"object\",\n            \"properties\": {\n              \"role\": {\n                \"type\": \"string\"\n              },\n              \"content\": {\n                \"type\": \"string\",\n                \"maxLength\": 4096\n              }\n            },\n            \"required\": [\n              \"role\",\n              \"content\"\n            ]\n          }\n        },\n        \"stream\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"max_tokens\": {\n          \"type\": \"integer\",\n          \"default\": 256\n        }\n      },\n      \"required\": [\n        \"messages\"\n      ]\n    }\n  ]\n}"
  output: "{\n  \"oneOf\": [\n    {\n      \"type\": \"object\",\n      \"contentType\": \"application/json\",\n      \"properties\": {\n        \"response\": {\n          \"type\": \"string\"\n        }\n      }\n    },\n    {\n      \"type\": \"string\",\n      \"contentType\": \"text/event-stream\",\n      \"format\": \"binary\"\n    }\n  ]\n}"
```

#### Superior Reasoning Use Cases - Meta Llama 3 LLM

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
  input: "{\n  \"type\": \"object\",\n  \"oneOf\": [\n    {\n      \"properties\": {\n        \"prompt\": {\n          \"type\": \"string\",\n          \"maxLength\": 4096\n        },\n        \"raw\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"stream\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"max_tokens\": {\n          \"type\": \"integer\",\n          \"default\": 256\n        }\n      },\n      \"required\": [\n        \"prompt\"\n      ]\n    },\n    {\n      \"properties\": {\n        \"messages\": {\n          \"type\": \"array\",\n          \"items\": {\n            \"type\": \"object\",\n            \"properties\": {\n              \"role\": {\n                \"type\": \"string\"\n              },\n              \"content\": {\n                \"type\": \"string\",\n                \"maxLength\": 4096\n              }\n            },\n            \"required\": [\n              \"role\",\n              \"content\"\n            ]\n          }\n        },\n        \"stream\": {\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"max_tokens\": {\n          \"type\": \"integer\",\n          \"default\": 256\n        }\n      },\n      \"required\": [\n        \"messages\"\n      ]\n    }\n  ]\n}"
  output: "{\n  \"oneOf\": [\n    {\n      \"type\": \"object\",\n      \"contentType\": \"application/json\",\n      \"properties\": {\n        \"response\": {\n          \"type\": \"string\"\n        }\n      }\n    },\n    {\n      \"type\": \"string\",\n      \"contentType\": \"text/event-stream\",\n      \"format\": \"binary\"\n    }\n  ]\n}"
```

## Cloudflare Vectorize

Vectorize is a globally distributed vector database that enables you to build full-stack, AI-powered applications with Cloudflare Workers. Vectorize makes querying embeddings faster and easier. By storing the embeddings generated by a machine learning model, including those built-in to Workers AI or by bringing your own from platforms like OpenAI, you can build applications with powerful search, similarity, recommendation, classification and/or anomaly detection capabilities based on your own data.

### Vectors

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

### Operations

#### Insert vectors

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

#### Upsert vectors

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

#### Query vectors

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

### Binding to a Worker

Bindings allow you to attach resources, including Vectorize indexes, to your Worker. In the Env, it's defined as:
```ts
export interface Env {
  VECTORIZE_INDEX: VectorizeIndex;
}
```
