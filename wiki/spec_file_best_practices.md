# Spec File Best Practices

## Functional requirements section

⚠️ This section might contain technical terms, but still makes it easy for someone with limited technical knowledge to grasp the main ideas. It is placed at the beginning of the Spec File within a comment block.

### ✅️ Do

- **Elevator Pitch**: Clearly describe what the worker does and how it can be used. Anyone on the team should be able to understand the worker's purpose and value, regardless of their role and specialization. For example: _"This worker generates vector embeddings for input text using Workers AI Text Embedding Model and is used in applications requiring vector search. The worker provides an HTTP API endpoint which accepts a single text as input and returns the corresponding vector embedding."_

- **Highlight Specific Project Priorities**: Focus on what the worker should achieve, not how it should be built. For instance, say _"The worker should include extensive error handling,"_ rather than listing specific error cases like _"The worker should handle errors X, Y, Z."_

- **Provide Technical Details**: After the high-level description, include more detailed technical information, such as:
  - Input and output formats (e.g., JSON structures for REST APIs)
  - Database schemas (e.g., Drizzle schema definitions)
  - Algorithms that contain custom business logic (e.g., similarity score calculation)
  - Integration with other systems or services

- **Describe System Context**: If relevant, provide a brief explanation of how the worker fits into a larger system or interacts with other components. Keep this high-level and focused on the worker's immediate interactions.

- **Include Examples**: Where helpful, provide examples of input/output, SQL queries, or other relevant code snippets to illustrate the worker's functionality or usage.

### ❌ Avoid

- **Excessive Implementation Details**: Avoid providing step-by-step implementation instructions. Focus on what needs to be achieved rather than how to code it, letting the LLM break down complex problems into individual steps.

- **Excessive System of Systems Context**: Refrain from providing detailed descriptions of the broader system or external components that the worker isn't touching directly. Concentrate on the worker’s specific role, decoupling it from the larger system as much as possible.

## Integration tests section

⚠️ This section should focus on testing the worker as a black box, verifying functionality without making assumptions about the internal implementation.

### ✅️ Do

- **Validate Input/Output Schemas**: Ensure that the test cases check the validity of input and output schemas without any assumptions about how those inputs and outputs are generated. Example:

```ts
expect(result['embedding'].every((x) => typeof x === 'number')).toBeTruthy();
```

- **Use Real-World Data Mocks**: Utilize mock data that closely resembles real-world scenarios. This ensures the tests are relevant and reflect actual use cases. Example:

```ts
const mockMessages = [
{
id: '1645479494256594945',
platform: 'RSS',
text: 'Cryptocurrency theft: $13.9M stolen from South Korean exchange GDAC',
},
];
```

- **Descriptive Test Names**: Write clear and descriptive test names that align with the functional requirements of the worker. If needed, include technical details in the test description to clarify the test's purpose. Example:

```ts
it('should fetch the latest unclassified texts from DB', async () => {
/**
* This test checks that the worker correctly fetches the most recent unclassified texts
* from the database, ensuring proper database query functionality.
*/
});
```

- **Test Database Interactions**: If your worker interacts with a database, simulate these interactions using mock methods instead of real database calls. This allows you to test database operations without a testing infrastructure.

1. Replace actual database calls with mock methods to prevent real database interactions during testing.
2. Use spies or mocks to capture the arguments passed to these mock methods, allowing you to inspect the data being used.
3. Assert that the mocked methods are called with the expected data to verify that the database interactions are functioning as expected.

Example:

```ts
it('should correctly insert JSON data into the database', async () => {
const expectedData = { id: 1, name: 'Test' };

// Mock the Drizzle ORM insert method to prevent real database interaction
const insertMock = vi.fn().mockResolvedValue([expectedData]);
(drizzle.pgTable as any).mockReturnValue({
insert: insertMock,
});

// Simulate the action that triggers the database insert
const response = await SELF.fetch('https://example.com/insert', {
method: 'POST',
body: JSON.stringify(expectedData),
});

// Verify that the insert method was called with the correct data
expect(insertMock).toHaveBeenCalledWith(expectedData);
});
```

### ❌ Avoid

- **Unit Tests or Internal Implementation Checks**: Avoid testing specific internal functions or logic, as integration tests should generally treat the worker as a black box. Example:

```ts
it('calculates similarity score', () => {
expect(calculateScore(0.8, 0.3)).toBeCloseTo(0.7273);
});
```

- **Random Data Mocks**: Avoid using randomly generated data in mocks. They put functional requirements in questions and can throw LLMs off. Example:

```ts
const randomMockMessage = () => ({
id: Math.random().toString(36).substring(7),
platform: ['RSS', 'Twitter', 'Facebook'][Math.floor(Math.random() * 3)],
text: Math.random().toString(36).substring(7),
});

const mockMessages = Array.from({ length: 10 }, randomMockMessage);
```

- **Common-Sense Functionality Tests**: Refrain from testing trivial functionality. Assume that LLMs have seen enough good-quality examples for common functionality, such as logging, error handling, and back-off strategies.

### 🤔 Philosophical Points for Consideration

- **Limit Imports**: Keep things simple and standardized. Indispensable imports from Cloudflare, Vitest, Postgres, or Drizzle can be used without hesitation, but avoid importing packages for convenience reasons - other developers and LLMs might not be familiar with them.

- **Concise Specs**: Pay attention to the size of the Spec File. Consider modularizing, simplifying, or simply removing any non-essential content. When your file goes beyond a few hundred lines, and you are starting to touch LLM context windows, it might be time to split your worker into independent services. The goal is to keep Spec Files concise, manageable, readable, and maintainable.
