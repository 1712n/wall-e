<div align="center">
  <img src="./misc/readme/wall-e.png" height="128px" width="128px" />
</div>

<div align="center">
  <h3>Worker Assembly Large Language Engine</h3>
</div>

<br/>

## What's WALL-E?

_WALL-E_ is a GitHub bot that supercharges Test-Driven Development through automated generation of Cloudflare Workers. It can be activated by leaving a comment containing `/wall-e generate` in a pull request, as long as the head branch contains `test/index.spec.ts` with needed integration tests and comments describing general functional requirements for the worker. When done, WALL-E adds the resulting `src/index.ts` worker code to the head branch.

## How does it work?

### Prompt

The prompt sent to the LLM consists of 3 sections: instructions, test file, and additional documentation.

#### Instructions

The [instructions section](markdown/instructions.md) of the prompt is there to explain the task and the general environment. It's relatively static and shouldn't change too often.

#### `test/index.spec.ts`

The test file is copied from the head branch and should contain 2 important sections: comments covering all functional requirements and Vitest integration tests covering all input/output interfaces, as well as any business logic-related edge cases.

Please adhere to [our best practices](wiki/test_file_best_practices.md) when writing your test files!

#### Additional Documentation

LLMs can't keep up with Cloudflare documentation updates, so we maintain a separate [markdown file](markdown/documentation.md) with information about important features that were recently added to Cloudflare Workers.

## Code quality

### Human vs machine

You might probably be convinced that your home-made raviolis are superior to the ones made by the souless machines, but it's getting hard to compete with the latest-gen LLMs in terms of code quality and efficiency for smaller workers. If you have more complex projects, it's probably a good idea to split them into smaller components anyway.

### Testing strategy

Thanks to TDD, you always have all your integration tests to make sure that LLMs don't hallucinate and can hide additional tests and mock data outside `test/index.spec.ts` if you are afraid of LLMs cheating. GitHub Actions can automate code quality checks and run your integration tests.
