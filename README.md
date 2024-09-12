0240620</code> (default)</li>
  <li><code>claude-3-opus-20240229</code></li>
  <li><code>claude-3-sonnet-20240229</code></li>
  <li><code>claude-3-haiku-20240307</code></li>
  <li><code>gpt-4o-2024-08-06</code></li>
  <li><code>o1-preview-2024-09-12</code></li>
</ul>
</details>

</details>

## How does it work?

### Prompt

The prompt sent to the LLM consists of 3 sections: instructions, a spec file, and additional documentation.

#### Instructions

The [instructions section](markdown/instructions.md) of the prompt is there to explain the task and the general environment. It's relatively static and shouldn't change too often.

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
