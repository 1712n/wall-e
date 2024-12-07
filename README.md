<div align="center">
  <img src="./misc/readme/wall-e.png" height="128px" width="128px" />
</div>

<div align="center">
  <h3>Worker Assembly Large Language Engine</h3>
</div>

## Table of Contents
- [What's WALL-E?](#whats-wall-e)
- [Usage](#usage)
  - [Prerequisites](#prerequisites)
  - [Basic Usage](#basic-usage)
  - [Advanced Usage](#advanced-usage)
  - [Feedback Feature](#feedback-feature)
- [How It Works](#how-it-works)
- [Code Quality](#code-quality)

## What's WALL-E?

WALL-E is a GitHub bot that supercharges Test-Driven Development (TDD) through automated generation of Cloudflare Workers. Based on worker functional requirements and integration tests (Spec File), WALL-E creates corresponding worker code, streamlining the development process.

## Usage
### Prerequisites:
1. An open pull request with `test/index.spec.ts`
2. `test/index.spec.ts` Spec File containing:
   - Comments Section with functional requirements
   - Integration tests
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

| Parameter | Description | Default |
|--------|-------------|---------|
| `path` | custom path to a worker dir | repository root |
| `provider` | provider for code generation | anthropic |
| `temp`/`temperature` | model temperature setting (0-1) | 0.5 |

#### Available Providers

- `anthropic` (default)
- `openai`
- `googleai`

#### Available Models

- `claude-3-5-sonnet-20241022` (default)
- `gpt-4o-2024-11-20`
- `gemini-1.5-pro`
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

The prompt sent to the LLM consists of 3 sections: instructions, a spec file, and additional documentation.

#### Instructions

The [instructions section](markdown/instructions.md) of the prompt explains the task and the general environment. It's relatively static and shouldn't change too often.

#### `test/index.spec.ts`

The Spec File is copied from the head branch and should contain 2 important sections: comments covering all functional requirements and Vitest integration tests covering all input/output interfaces, as well as any business logic-related edge cases.

Please adhere to [our best practices](wiki/spec_file_best_practices.md) when writing your spec files!

#### Additional Documentation

Sometimes LLMs can't keep up with software updates, so we maintain a separate [markdown file](markdown/documentation.md) with information about recently added features.

## Code quality

### Human vs machine

You might probably be convinced that your home-made raviolis are superior to the ones made by the souless machines, but it's getting hard to compete with the latest-gen LLMs in terms of code quality and efficiency for smaller workers. If you have more complex projects, it's probably a good idea to split them into smaller components anyway.

### Testing strategy

Thanks to TDD, you always have all your integration tests to make sure that LLMs don't hallucinate and can hide additional tests and mock data outside `test/index.spec.ts` if you are afraid of LLMs cheating. GitHub Actions can automate code quality checks and run your integration tests.
