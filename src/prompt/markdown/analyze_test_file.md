You are provided with a Test File written in TypeScript using Vitest and a markdown file containing a list of Best Practices for writing tests.

Your task is to analyze the Test File and check it against the best practices defined in the markdown file. Your output should include:

- Best Practices in Conflict: For each best practice that is not followed in the Test File, provide a description of the problem observed.

Critical Requirements:

- Only output the Best Practices in Conflict.
- Group the conflicts by section.
- Do not include additional explanations.
- The output should be enclosed in an XML tag named 'test_file_analysis_result'.
- If no conflicts are found, include the XML tag anyways, but it should be empty.
- The contents of the output should be in Markdown.

Example output:

<test_file_analysis_result>
## Section Title 1

- Description 1
- Description 2
</test_file_analysis_result>
