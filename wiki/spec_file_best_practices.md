# Spec File Best Practices

⚠️ Pay attention to the size of the Spec File. Consider modularizing, simplifying, or simply removing any non-essential content. When your file goes beyond a few hundred lines, and you are starting to touch LLM context windows, it might be time to split your worker into independent services. The goal is to keep Spec Files concise, manageable, readable, and maintainable.

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

- **Limit Imports**: Keep things simple and standardized. Indispensable imports from Cloudflare, Vitest, Postgres, or Drizzle can be used without hesitation, but avoid importing packages for convenience reasons - other developers and LLMs might not be familiar with them.
- **Descriptive Test Names**: Write clear and descriptive test names that align with the functional requirements of the worker. If needed, include technical details in the test description to clarify the test's purpose.
- **Use Real-World Data Mocks**: Utilize mock data that closely resembles real-world scenarios. This ensures the tests are relevant and reflect actual use cases.
- **Mock Database Interactions**:  When testing database operations, use mock methods to simulate interactions with the database. This allows you to test various scenarios without relying on a real database.
- **Focus on Input/Output**: Concentrate on mocking the input and output of database operations. This approach ensures that your tests remain focused on the worker's external behavior and not on specific implementation details of database interactions.
- **Use High-Level Mocks**: Create high-level mocks for database operations that reflect the expected behavior without tying tests to specific implementation details. For example, mock the `insert` method of your ORM to return a predefined result.

**Example:**

```typescript
it('should correctly insert data into the database', async () => {
  const inputData = { id: 1645479494256594945, platform: 'RSS', text: 'Cryptocurrency theft: $13.9M stolen from South Korean exchange GDAC', };
  const expectedOutput = [{ id: 1645479494256594945, platform: 'RSS', text: 'Cryptocurrency theft: $13.9M stolen from South Korean exchange GDAC' }];

  // High-level mock of database insert operation
  const insertMock = vi.fn().mockResolvedValue(expectedOutput);
  (dbMock.insert as any).mockReturnValue({ values: insertMock });

  const response = await SELF.fetch('https://example.com/insert', {
    method: 'POST',
    body: JSON.stringify(inputData),
  });

  // Verify the response based on the expected output
  const responseData = await response.json();
  expect(responseData).toEqual(expectedOutput);
});
```

### ❌ Avoid

- **Unit Tests or Internal Implementation Checks**: Avoid testing specific internal functions or logic, as integration tests should generally treat the worker as a black box.
- **Random Data Mocks**: Avoid using randomly generated data in mocks. They put functional requirements in questions and can throw LLMs off.
- **Common-Sense Functionality Tests**: Refrain from testing trivial functionality. Assume that LLMs have seen enough good-quality examples for common functionality, such as logging, error handling, and back-off strategies.
- **Mocking Specific DB Queries**: Avoid mocking specific SQL queries or Drizzle query builder methods (e.g., `drizzle.select().from().where()`). Instead, focus on mocking the ORM methods like `insert`, `update`, etc., and assert on the data being passed to them.
- **Testing Internal DB Method Calls**: Do not assert that specific database methods are called with certain arguments. This focuses on implementation details rather than the worker's behavior in response to mocked database interactions.
- **Testing Internal DB Logic**: Avoid testing the internal workings of the database or ORM. Focus on the inputs your code provides to the database and the outputs it expects.
