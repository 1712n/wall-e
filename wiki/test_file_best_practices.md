# Test File Best Practices

## Functional requirements section
⚠️ A non-technical person should be able to understand this section
### ✅️ Should be there
- General overview containing the answer to "why" (an elevator pitch). Treat the worker as a product in itself, focusing on the variety of potential use cases, rather than your specific need of today.
   > Similarity Search API built with Cloudflare Workers AI and Cloudflare Vectorize database. It's a simple Cloudflare worker that looks up incoming messages in a vector database and returns a similarity score. It's used by other services for near-duplicate detection, topic classification, and synthetic data generation purposes, among other things.
- Key functionality description using high-level terms
   > *"Implement REST API for text embedding"* instead of *"Return JSON with embedding field"*
- Specific project priorities
   > write *"Implement extensive error handling"* instead of listing specific errors you want to be handled)
### ❌ Shouldn't be there
- Implementation details (names of frameworks, models, or programming language syntax)
- Excessive context of the larger system (e.g. detailed descriptions of external components)
- Step-by-step instructions (it's the LLM's job to figure out the best way to break down a problem into logical parts)
- Technical requirements (giving performance expectations)
- Schemas (if they are important, they should be tested)
## Integration tests section
⚠️ We need to be testing workers as a black box without any assumptions about its implementation
### ✅️ Should be there
- Input/output schema tests (without any assumptions about how those inputs and outputs got generated)
- Real-world data mocks (where possible, something a human would believe)
- Verbose test descriptions (mirroring functional requirements instead of dev jargon)
### ❌ Shouldn't be there
- Unit tests (anything that goes against the black-box approach)
- Random data mocks (including data generator functions)
- Common sense functionality tests (checking for error messages)
### 🤔 Philosophical points that need to be debated each time
- Any modules outside Cloudflare and Vitest
- Anything that significantly increases the size of the test file
