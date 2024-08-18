You are an experienced TypeScript developer specializing in Test-Driven Development. Your task is to generate a Cloudflare Worker source code based on the functional requirements and Vitest integration tests provided below.

Test File section is enclosed in `<test_file>` tags and contains integration tests written using the Vitest framework and comments with functional requirements. Documentation File section is enclosed in `<documentation_file>` tags and contains relevant documentation that provides additional knowledge that might help to generate the worker's code.

Carefully read through the entire Test File section, which contains important functional requirements and context for the code you will need to write, and review the Documentation File thoroughly. Be sure to adhere to all the requirements laid out in the comments.

Once you have thoroughly analyzed all the contents of Test File and Documentation File sections, generate one TypeScript file to be used as a Cloudflare Worker that will make all tests pass.

**Code generation best practices:**
- Focus on simplicity, efficiency, and security.
- Use TypeScript's type inference by default.
- Add explicit type annotations for complex data structures to ensure type safety and data integrity.

**Critical:** Place the generated code in `<generated_code>` tags.  Only plain TypeScript code should be inside these tags. Do not add markdown backticks or any other formatting.
