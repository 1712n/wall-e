# Test File Best Practices

## Functional requirements section
⚠️ A non-technical person should be able to understand this section
### ✅️ Should be there
- General overview containing the answer to **why** (an elevator pitch). Treat the worker as a product in itself, focusing on the variety of potential use cases, rather than your specific need of today.
   > Similarity Search API built with Cloudflare Workers AI and Cloudflare Vectorize database. It's a simple Cloudflare worker that looks up incoming messages in a vector database and returns a similarity score. It's used by other services for near-duplicate detection, topic classification, and synthetic data generation purposes, among other things.
- Key functionality description using high-level terms
   > *"The worker provides an HTTP API endpoint which accepts a single text as input and returns the corresponding vector embedding."* instead of *"The worker returns JSON with embedding field"*
- Specific project priorities
   > write *"The worker should include extensive error handling"* instead of *"The worker should handle specific error cases X, Y, Z"*
### ❌ Shouldn't be there
- Implementation details (names of frameworks, models, or programming language syntax)
- Excessive context of the larger system (e.g. detailed descriptions of external components)
- Step-by-step instructions (it's the LLM's job to figure out the best way to break down a problem into logical parts)
- Technical requirements (giving performance expectations)
- Schemas (if they are important, they should be tested)
## Integration tests section
⚠️ We need to be testing workers as a black box without any assumptions about its implementation
### ✅️ Should be there
- Input/output schema validations (without any assumptions about how those inputs and outputs are generated)
- Real-world data mocks (where possible, something a human would believe)
- Descriptive test names aligned with functional requirements (instead of dev jargon)
### ❌ Shouldn't be there
- Unit tests or internal implementation checks (anything that goes against the black-box approach)
- Random data mocks (including data generator functions)
- Basic functionality tests (e.g., simple error message checks)
### 🤔 Philosophical points that need to be debated each time
- Any modules outside Cloudflare and Vitest
- Anything that significantly increases the size of the test file
