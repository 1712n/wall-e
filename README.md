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
  - [Installing](#installing)
  - [Prerequisites](#prerequisites)
    - [1. Set up your project](#1-set-up-your-project)
    - [2. Create or update a Pull Request](#2-create-or-update-a-pull-request)
    - [3. Prepare the `test/index.spec.ts` file](#3-prepare-the-testindexspects-file)
  - [Basic Usage](#basic-usage)
  - [Advanced Usage](#advanced-usage)
    - [Available Providers](#available-providers)
    - [Available Models](#available-models)
    - [Improve Feature](#improve-feature)
- [How It Works](#how-it-works)
  - [Prompt](#prompt)
    - [Instructions](#instructions)
    - [`test/index.spec.ts`](#testindexspects)
- [Code quality](#code-quality)
  - [Human vs machine](#human-vs-machine)

## What's WALL-E?

WALL-E is a GitHub bot that supercharges spec-driven development through automated generation of Cloudflare Workers. Based on worker functional requirements and integration tests (Spec File), WALL-E creates corresponding worker code, streamlining the development process.

## Usage

### Installing

Install the bot by visiting the [GitHub App installation page](https://github.com/apps/wall-e-dni) and follow these steps:

1. On the app page, click "Install" in the top-right corner
2. Select your organization or personal account where you'd like to install the app.
3. Choose "All repositories" or select specific ones where the bot should be active. 
4. After selecting repositories, click "Install" again to finish.

Once installed, the bot will automatically start working based on your repository configuration.

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

Follow [spec file best practices](wiki/spec_file_best_practices.md/) for creating your `test/index.spec.ts` file.

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

| Parameter     | Aliases | Description                                    | Default                  |
| ------------- | ------- | ---------------------------------------------- | ------------------------ |
| `path`        |         | custom path to a worker dir                    | repository root          |
| `provider`    |         | provider for code generation                   | googleai                 |
| `model`       |         | model name from the provider                   | gemini-2.5-pro-exp-03-25 |
| `temperature` | `temp`  | model temperature setting (0-1)                | 0.5                      |
| `fallback`    |         | whether or not you want to use fallback models | true                     |

#### Available Providers

- `anthropic`
- `openai`
- `googleai`

#### Available Models

- `claude-sonnet-4-20250514`
- `claude-sonnet-4-20250514-thinking`
- `claude-opus-4-20250514`
- `claude-opus-4-20250514-thinking`
- `gpt-4.1`
- `o4-mini-2025-04-16`
- `o3-pro-2025-06-10`
- `gemini-2.0-pro-exp-02-05` (Medium-size, search grounding disabled)
- `gemini-2.0-flash-thinking-exp-01-21` (Small size, thinking, search grounding disabled)
- `gemini-2.0-flash` (Small size, search grounding enabled)
- `gemini-2.5-pro-preview-06-05`

#### Improve Feature

The Improve Feature uses the existing code and spec file to generate optimized code based on the provided feedback. Example:

```
/wall-e improve path:workers/deduplicated-insert provider:googleai

---
- No need to import "Ai" from `cloudflare:ai` package
- Update "AI" binding to use "Ai" as type
```

Use this feature when you need to improve generated code with aspects not covered in spec files, such as:

- Fixing imports
- Adjusting types
- Correcting API usage
- Correcting typos

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
