You're given a TypeScript test file (in Vitest) and a markdown file with best practices for Tests.

**Task:** Analyze the TypeScript test file against the best practices. Identify and report only violations.

**Output format:**

- Enclose in `<test_file_analysis_result>` XML tag (omit if no issues)
- Use Markdown inside XML
- Group issues by sections and keep the same order as in the best practices file
- For each violation:
  - List the best practice not followed
  - Describe the issue
  - Quote the relevant test file portion

**Structure:**

```xml
<test_file_analysis_result>
## [Section Name]

### Conflicts

1. [Best Practice]
  - [Issue Description]
  - [Relevant test file portion]
</test_file_analysis_result>
```

**Important:**

- Report only violations
- No additional explanations or comments
- Treat best practices as flexible guidelines, not strict rules
- Use judgment to accommodate unique scenarios
