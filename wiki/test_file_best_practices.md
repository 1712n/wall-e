# Test File Best Practices

## Functional requirements section
⚠️ A non-technical person should be able to understand this section
### ✅️ Do
- General overview containing the answer to **why** (an elevator pitch). Treat the worker as a product in itself, focusing on the variety of potential use cases, rather than your specific need of today.
   > Similarity Search API built with Cloudflare Workers AI and Cloudflare Vectorize database. It's a simple Cloudflare worker that looks up incoming messages in a vector database and returns a similarity score. It's used by other services for near-duplicate detection, topic classification, and synthetic data generation purposes, among other things.
- Key functionality description using high-level terms
   > *"The worker provides an HTTP API endpoint which accepts a single text as input and returns the corresponding vector embedding."* instead of *"The worker returns JSON with embedding field"*
- Specific project priorities
   > write *"The worker should include extensive error handling"* instead of *"The worker should handle specific error cases X, Y, Z"*
### ❌ Avoid
- Implementation details (names of frameworks, models, or programming language syntax)
- Excessive context of the larger system (e.g. detailed descriptions of external components)
- Step-by-step instructions (it's the LLM's job to figure out the best way to break down a problem into logical parts)
- Technical requirements (giving performance expectations)
- Schemas (if they are important, they should be tested)
## Integration tests section
### 🎯 Key Principle
Test workers as a black box, without assumptions about internal implementation.
### ✅️ Do
- Input/output schema validations (without any assumptions about how those inputs and outputs are generated)
```ts
expect(result["embedding"].every((x) => typeof x === "number")).toBeTruthy();
```
- Real-world data mocks (where possible, something a human would believe)
```ts
  const mockMessages = [
  {
    id: "1645479494256594945",
    platform: "RSS",
    text: "Cryptocurrency theft: $13.9M stolen from South Korean exchange GDAC",
  },
  // More real examples...
];
```
- Descriptive test names aligned with functional requirements (instead of dev jargon)
```ts
// Do
it('should select latest unclassified texts from DB', async () => {
  });
// Avoid
it('DB update', async () => {
  });
```
### ❌ Avoid
- Unit tests or internal implementation checks (anything that goes against the black-box approach)
```ts
it('calculates similarity score', () => {
  expect(calculateScore(0.8, 0.3)).toBeCloseTo(0.7273);
});
```
- Random data mocks (including data generator functions)
- Basic functionality tests (e.g., simple error message checks)
### 🤔 Philosophical points that need to be debated each time
- Any modules outside Cloudflare and Vitest
- Anything that significantly increases the size of the test file
