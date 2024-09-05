# Spec File Best Practices

## Functional requirements section

⚠️ This section should start with a non-technical overview and then progress to more detailed technical specifications. It is placed at the beginning of the Spec File within a comment block.

### ✅️ Do

- **Start with a General Overview**: Begin with a brief, non-technical description of why this worker is needed. Think of this as an elevator pitch: clearly describe what the worker does and how it can be used. This helps everyone, regardless of their technical background, understand the worker's purpose and value. Example: _"This worker generates vector embeddings for input text using Workers AI Text Embedding Model and is used in applications requiring vector search. The worker provides an HTTP API endpoint which accepts a single text as input and returns the corresponding vector embedding."_

- **Describe Key Functionality**: After the overview, provide a more detailed explanation of the worker's functionality. Use a mix of high-level language and specific technical terms as needed. For example: _"The worker processes recent messages without existing embeddings, generates vector embeddings using an AI model, calculates similarity scores, and updates the database with new scores."_

- **Include Specific Project Priorities**: List important aspects of the worker's implementation, such as performance requirements, error handling, or specific technologies to be used. For instance: _"The worker should implement batch processing to optimize database operations, include comprehensive error handling and logging, and utilize the latest-gen LLM with a large context window."_

- **Provide Technical Details**: After the high-level description, include more detailed technical information such as:
  - Input and output formats (e.g., JSON structures for REST APIs)
  - Database schemas (e.g., Drizzle schema definitions)
  - Specific algorithms or processes (e.g., similarity score calculation methods)
  - Integration with other systems or services

- **Describe System Context**: If relevant, provide a brief explanation of how the worker fits into a larger system or interacts with other components. Keep this high-level and focused on the worker's immediate interactions.

- **Include Examples**: Where helpful, provide examples of input/output, SQL queries, or other relevant code snippets to illustrate the worker's functionality or usage.

### ❌ Avoid

- **Starting with Technical Details**: Don't begin the spec with in-depth technical information. Always start with a non-technical overview to ensure accessibility for all readers.

- **Excessive Implementation Details**: While more technical details are now included, avoid providing step-by-step implementation instructions. Focus on what needs to be achieved rather than how to code it, letting the LLM break down complex problems into individual steps.

- **Overcomplicating the Overview**: Keep the initial description simple and accessible. Technical details should be reserved for later sections of the spec.

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
