<div align="center">
  <img src="./misc/readme/wall-e.png" height="128px" width="128px" />
</div>

<div align="center">
  <h3>Worker Assembly Large Language Engine</h3>
</div>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [What's WALL-E?](#whats-wall-e)
- [Usage](#usage)
  - [Prerequisites](#prerequisites)
    - [1. Set up your project](#1-set-up-your-project)
    - [2. Create or update a Pull Request](#2-create-or-update-a-pull-request)
    - [3. Prepare the `test/index.spec.ts` file](#3-prepare-the-testindexspects-file)
  - [Basic Usage](#basic-usage)
  - [Advanced Usage](#advanced-usage)
    - [Available Providers](#available-providers)
    - [Available Models](#available-models)
  - [Feedback Feature](#feedback-feature)
- [How It Works](#how-it-works)
  - [Prompt](#prompt)
    - [Instructions](#instructions)
    - [`test/index.spec.ts`](#testindexspects)
- [Code quality](#code-quality)
  - [Human vs machine](#human-vs-machine)

## What's WALL-E?

WALL-E is a GitHub bot that supercharges spec-driven development through automated generation of Cloudflare Workers. Based on worker functional requirements and integration tests (Spec File), WALL-E creates corresponding worker code, streamlining the development process.

## Usage
### Prerequisites

#### 1. Set up your project
- **For a new project:**  
  Create a Cloudflare Worker project by running:
  ```sh
  npm create cloudflare@latest -- your-worker-name
  ```
  Replace `your-worker-name` with the desired name of your worker. This command initializes a new project in a directory named after your worker.

- **For an existing project:**  
  Ensure your project includes the required `test/index.spec.ts` file (details below).

#### 2. Create or update a Pull Request

Open a pull request that includes your `test/index.spec.ts` file.

#### 3. Prepare the `test/index.spec.ts` file

The file should include the following:
  - A comments section listing functional requirements.
  - Integration tests to validate functionality.

### Basic Usage

Activate WALL-E in a pull request by commenting:

```
/wall-e generate
```

### Advanced Usage

For more control, use optional parameters:

```
/wall-e generate path:workers/generate-embeddings provider:openai temperature:0.8
```

| Parameter            | Description                     | Default         |
| -------------------- | ------------------------------- | --------------- |
| `path`               | custom path to a worker dir     | repository root |
| `provider`           | provider for code generation    | googleai        |
| `temp`/`temperature` | model temperature setting (0-1) | 0.5             |

#### Available Providers

- `googleai` (default)
- `anthropic`
- `openai`

#### Available Models

- `gemini-2.0-flash-exp` (default, search grounding enabled)
- `claude-3-5-sonnet-20241022`
- `gpt-4o-2024-11-20`
- `gemini-exp-1206`

### Feedback Feature

The Feedback Feature allows you to improve existing code or add extra requirements. 

Activate the feedback feature in a pull request by commenting:

```
/wall-e improve path:workers/deduplicated-insert provider:googleai

---
- Add user authentication via API Key (stored in Env)
- No need to import "AI" from cloudflare:ai package
```

## How It Works
### Prompt

The prompt sent to the LLM consists of 2 sections: instructions and a spec file.

#### Instructions

The [instructions section](src/prompt/markdown/generate_worker.md) of the prompt explains the task and the general environment. It's relatively static and shouldn't change too often.

#### `test/index.spec.ts`

The Spec File is copied from the head branch and should contain 2 important sections: comments covering all functional requirements and Vitest integration tests covering all input/output interfaces, as well as any business logic-related edge cases.

Please adhere to [our best practices](wiki/spec_file_best_practices.md) when writing your spec files!

## Code quality
### Human vs machine

You might probably be convinced that your home-made raviolis are superior to the ones made by the soulless machines, but it's getting hard to compete with the latest-gen LLMs in terms of code quality and efficiency for smaller workers. If you have more complex projects, it's probably a good idea to split them into smaller components anyway.
