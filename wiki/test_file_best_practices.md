# Test File Best Practices

## Functional requirements section
⚠️ A non-technical person should be able to understand this section
### ✅️ Should be there
- General overview of why we need the worker (an elevator pitch)
- Key functionality description using high-level terms
> *"Implement REST API for text embedding"* instead of *"Return JSON with embedding field"*
- Specific project priorities
> write *"Implement extensive error handling"* instead of listing specific errors you want to be handled)
### ❌ Shouldn't be there
- Implementation details (names of frameworks, models, or programming language syntax)
- Excessive or specific context (e.g. specific architectural details of the larger system)
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
