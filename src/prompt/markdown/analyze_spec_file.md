You're given a Spec File containing functional requriments and Vitest integration tests and a markdown file with Spec File Best Practices. Your task is to analyze the Spec File against the Best Practices. Identify and report up to 3 violations you are confident about.
Output format:

- Enclose in `<spec_file_analysis_result>` XML tags
- Use Markdown inside XML
- Group issues by sections and keep the same order as in the best practices file
- For each violation:
- List the best practice not followed
- Describe the issue
- Quote the relevant Spec File section
- Suggest an easy fix

Follow this structure:

```xml
<spec_file_analysis_result>
<details>
<summary>[Section Name]</summary>
### Conflicts
1. [Best Practice]
- [Issue Description]
- [Relevant spec file section quote]
- [Easy Fix]
</details>
</spec_file_analysis_result>
```
