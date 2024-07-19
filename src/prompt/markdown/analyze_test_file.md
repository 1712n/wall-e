You're given two files: a TypeScript test file (Vitest) and a markdown file of test-writing best practices.

Task: Analyze the TypeScript test file against the best practices. Identify and report only violations.

Output format:
- Enclose in <test_file_analysis_result> XML tag (omit if no issues)
- Use Markdown inside XML
- Group issues by sections from the best practices file
- Maintain section order from best practices
- For each violation:
  - List best practice not followed
  - Describe the issue
  - Quote relevant test file portion

Structure:

```xml
<test_file_analysis_result>
## [Section Name]

### Conflicts

1. [Best Practice]
   - [Issue Description]
   - [Relevant Quote]
</test_file_analysis_result>
```

Important:

- Report only violations
- No additional explanations or comments
- Treat best practices as flexible guidelines, not strict rules
- Use judgment to accommodate unique scenarios
