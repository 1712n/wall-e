# Spec File Best Practices

⚠️ Pay attention to the size of the Spec File. Consider modularizing, simplifying, or simply removing any non-essential content. When your file goes beyond a few hundred lines, and you are approaching LLM context windows, it might be time to split your worker into independent services. The goal is to keep Spec Files concise, manageable, readable, and maintainable.

## Functional requirements section

⚠️ This section might contain technical terms, but still makes it easy for someone with limited technical knowledge to grasp the main ideas. It is placed at the beginning of the Spec File within a JSDoc-style comment block.

### ✅️ Do

- **Elevator Pitch**: Clearly describe what the worker does and how it can be used. Anyone on the team should be able to understand the worker's purpose and value, regardless of their role and specialization. For example: _"This worker generates vector embeddings for input text using Workers AI Text Embedding Model and is used in applications requiring vector search. The worker provides an HTTP API endpoint which accepts a single text as input and returns the corresponding vector embedding."_
- **Specific Project Priorities**: Focus on what the worker should achieve, not how it should be built. For instance, say _"The worker should include extensive error handling,"_ rather than listing specific error cases like _"The worker should handle errors X, Y, Z."_
- **Technical Requirements**: After the high-level description, include more detailed technical information, such as:
- Input and output formats (e.g., JSON structures for REST APIs)
- Database schemas (e.g., Drizzle schema definitions)
- Algorithms that contain custom business logic (e.g., similarity score calculation)
- Integration with other systems or services
- **System Context**: If relevant, provide a brief explanation of how the worker fits into a larger system or interacts with other components. Keep this high-level and focused on the worker's immediate interactions.
- **Examples**: Where helpful, provide examples of input/output, SQL queries, or other relevant code snippets to illustrate the worker's functionality or usage.

### ❌ Avoid

- **Excessive Implementation Details**: Avoid providing step-by-step implementation instructions. Focus on what needs to be achieved rather than how to code it, letting the LLM break down complex problems into individual steps.
- **Excessive System of Systems Context**: Refrain from providing detailed descriptions of the broader system or external components that the worker isn't touching directly. Concentrate on the worker’s specific role, decoupling it from the larger system as much as possible.

## Integration tests section

⚠️ This section should focus on testing the worker as a black box, verifying functionality without making assumptions about the internal implementation.

### ✅️ Do

- **Limit Imports**: Keep imports simple and standardized, defining them at the top of the file, either before or after the functional requirements section. Use only essential imports for testing and key services, like those from Cloudflare, Vitest, Postgres, or Drizzle, and avoid adding extra packages for convenience. This keeps dependencies clear and familiar for both developers and LLMs. Example:

```typescript
import { SELF, env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import * as worker from '../src';
import { users } from '../schema';
```

- **Realistic Data Object Mocks at Key Stages**: Utilize mock data that closely resembles real-world scenarios and includes edge cases and boundary conditions where relevant. Assert data objects at meaningful data transformation stages to illustrate the expected behavior. This allows you to retain control over the component's architecture without imposing specific algorithms at each data transformation stage. Example:

```ts
const mockOpenAIBatchAPIResponse = [
  {"custom_id": "0", "response": {"body": {"choices": [{"message": {"content": "0.75"}}]}}},
  {"custom_id": "1", "response": {"body": {"choices": [{"message": {"content": "0.32"}}]}}},
  {"custom_id": "2", "response": {"body": {"choices": [{"message": {"content": "0.67"}}]}}},
  {"custom_id": "3", "response": {"body": {"choices": [{"message": {"content": "0.22"}}]}}}
];
it('should prepare an update for messageScores table based on the OpenAI Batch API response', async () => {
  const actualClassificationScores = await updateMessageScores(mockOpenAIBatchAPIResponse);
  expect(actualClassificationScores).toEqual(expectedClassificationScoreUpdate);
});
```

### ❌ Avoid

- **Unit Tests or Internal Implementation Checks**: Avoid testing specific internal functions or logic, as integration tests should treat the worker as a black box. Example:

```typescript
it('calculates similarity score', () => {
  expect(calculateScore(0.8, 0.3)).toBeCloseTo(0.7273);
});
```

- **Mocking Internal Functions**: Refrain from mocking internal worker functions. Instead, evaluate them within the complete integration to verify real outputs. Example:

```typescript
it('should process message with mocked internal validator', () => {
  jest.spyOn(worker, 'validateMessage').mockImplementation(() => true);
  
  const result = worker.processMessage(message);
  expect(result.isValid).toBe(true);
});
```

- **Randomly Generated Data in Mocks**: Avoid using data generated by functions like _Math.random()_ in mocks. Randomized data can obscure functional requirements and complicate debugging. Example:

```typescript
const randomMockMessage = () => ({
  id: Math.random().toString(36).substring(7),
  platform: ['RSS', 'Twitter', 'Facebook'][Math.floor(Math.random() * 3)],
  text: Math.random().toString(36).substring(7),
});

const mockMessages = Array.from({ length: 10 }, randomMockMessage);
```

- **Common-Sense Functionality Tests**: Refrain from testing trivial functionality. Assume LLMs have seen sufficient high-quality examples of common practices, such as logging, error handling, and back-off strategies.

```typescript
it('should return error when content-type header is missing', async () => {
  const credentials = {
    username: 'the_donald',
    password: 'badPassword123',
  };
  const response = await SELF.fetch('https://example.com/login', {
    body: JSON.stringify(credentials), // Content is JSON encoded
    method: 'POST',
    // content-type header is intentionally omitted to simulate the error
  });
  expect(response.status).toBe(400); // Assuming server returns 400 for missing content-type
  expect(response.json()).toEqual({
    error: 'Content-Type header missing',
  });
});
```
