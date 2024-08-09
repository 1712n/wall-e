You're given a TypeScript test file in Vitest and a markdown file with Test File Best Practices. Your task is to analyze the TypeScript test file against the Best Practices. Identify and report only violations.  
Output format:

- Enclose in `<test_file_analysis_result>` XML tags
- Use Markdown inside XML
- Group issues by sections and keep the same order as in the best practices file
- For each violation:
- List the best practice not followed
- Describe the issue
- Quote the relevant test file portion

Follow this structure:

```xml
<test_file_analysis_result>
<details>
<summary>[Section Name]</summary>
### Conflicts
1. [Best Practice]
- [Issue Description]
- [Relevant test file portion]
</details>
</test_file_analysis_result>
```
