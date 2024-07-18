You have been given two files: a TypeScript test file using Vitest and a markdown file listing best practices for writing tests.

Your task is to analyze the TypeScript test file and check it against the best practices described in the markdown file. Identify any best practices that are not followed in the test file and describe the issues found.

Instructions:

- *Identify Violations*: Only report the best practices that are not followed in the test file.
- *Organize by Section*: Group the identified issues under their respective sections from the markdown file.
- *XML Format*: Enclose the entire output in an XML tag named 'test_file_analysis_result'.
- *Exclude XML tag if empty*: If no issues are found, do not include the XML tag.
- *Markdown Inside XML*: The content within the XML tag should be formatted in Markdown.
- *No Additional Explanations*: Do not add any explanations or comments beyond the required descriptions.

Example output:

<test_file_analysis_result>
## Functional requirements section

- Description 1
- Description 2

## Integration tests section

- Description 3
</test_file_analysis_result>
