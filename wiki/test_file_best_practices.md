# Test File Best Practices

## Functional requirements section

⚠️ This section should be easy to understand for someone without technical knowledge. It is placed at the beginning of the test file within a comment block.

### ✅️ Do

- **Provide a General Overview**: Start with a brief explanation of why this worker is important. Think of this as an elevator pitch: clearly describe what the worker does and how it can be used. This helps everyone, regardless of their technical background, understand the worker's purpose and value. Example: _"This worker generates vector embeddings for input text using Workers AI Text Embedding Model and is used in applications requiring vector search. The worker provides an HTTP API endpoint which accepts a single text as input and returns the corresponding vector embedding. The worker should include extensive error handling and logging."_

- **Describe Key Functionality in Simple Terms**: Use high-level language to explain what the worker does. For example, say _"The worker provides an HTTP API endpoint that accepts a single text input and returns a vector embedding,"_ instead of _"The worker returns JSON with an embedding field."_ This makes the functionality easy to grasp.

- **Highlight Specific Project Priorities**: Focus on what the worker should achieve, not how it should be built. For instance, say _"The worker should include extensive error handling,"_ rather than listing specific error cases like _"The worker should handle errors X, Y, Z."_

- **Optional: Generalize Technology Requirements**: If relevant, describe the desired characteristics of the technology instead of specifying exact names. For example, rather than naming a particular model, you might say _"The worker requires a latest-gen LLM with a large context window and advanced reasoning capabilities."_ This leaves room for flexibility while ensuring key needs are met.

### ❌ Avoid

- **Excessive Implementation Details**: Avoid including detailed instructions on how to build or implement the worker. Focus on what the worker should accomplish, not on the specific steps to achieve it.

- **Excessive System Context**: Refrain from providing detailed descriptions of the broader system or external components. Concentrate on the worker’s specific role, as too much additional context can obscure its primary function.

- **Step-by-Step Instructions**: Do not include step-by-step instructions for tasks. The aim is for the LLM to effectively break down complex problems into manageable, logical steps.

- **Detailed Technical Requirements**: Avoid specifying exact technical details. Instead, concentrate on the overall functional objectives and leave the technical specifics to be determined by the LLM.

- **Schemas**: If schemas are important, they should be tested rather than included in the functional requirements.

## Integration tests section

### 🎯 Key Principle

Test workers as a black box, without assumptions about internal implementation.

### ✅️ Do

- Input/output schema validations (without any assumptions about how those inputs and outputs are generated)
```ts
expect(result['embedding'].every((x) => typeof x === 'number')).toBeTruthy();
```

- Use real-world data mocks where possible, ensuring they resemble something a human would believe.
```ts
const mockMessages = [
	{
		id: '1645479494256594945',
		platform: 'RSS',
		text: 'Cryptocurrency theft: $13.9M stolen from South Korean exchange GDAC',
	},
];
```

- Use descriptive test names aligned with functional requirements. Optionally include technical information in test descriptions if it helps clarify the test's purpose.
```ts
// Do
it('should select the latest unclassified texts from DB', async () => {
	// This test checks that the worker correctly fetches the most recent unclassified texts from the database, ensuring proper database query functionality.
});

// Avoid
it('DB update', async () => {
	// This test lacks clarity about the specific functionality being tested.
});
```

### ❌ Avoid

- **Unit Tests or Internal Implementation Checks**: Avoid testing specific internal functions or logic, as integration tests should generally treat the worker as a black box. However, it is acceptable to include Drizzle ORM function calls, such as SQL query construction and validation. Example:
```ts
it('calculates similarity score', () => {
	expect(calculateScore(0.8, 0.3)).toBeCloseTo(0.7273);
});
```

- **Random Data Mocks**: Avoid using randomly generated data in mocks, as it can introduce unnecessary variability and make tests less predictable. Example:
```ts
const randomMockMessage = () => ({
	id: Math.random().toString(36).substring(7),
	platform: ['RSS', 'Twitter', 'Facebook'][Math.floor(Math.random() * 3)],
	text: Math.random().toString(36).substring(7),
});

const mockMessages = Array.from({ length: 10 }, randomMockMessage);
```

- **Common Sense Functionality Tests**: Refrain from testing trivial functionality that can be assumed to work as expected or can be covered by LLM-generated code without specific tests.

### 🤔 Philosophical Points for Consideration

- **Import Statements**: Imports from the `cloudflare:test` and `vitest` packages do not require justification. For all other packages, include a comment directly above the import statement that explains the purpose of the import to the test.

- **File Size Management**: Any content that significantly increases the size of the test file should be scrutinized. Consider whether the additional content is essential for comprehensive testing or if it can be modularized or simplified. The goal is to keep test files manageable, readable, and maintainable.
