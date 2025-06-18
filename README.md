# Smart PR Reviewer

A GitHub Action that provides intelligent code review and release notes
generation for pull requests using AI. The action automatically analyzes code
changes, provides specific code improvement suggestions, and generates
structured release notes to help streamline the code review process.

## Features

- Automated code review with contextual suggestions
- Smart release notes generation categorizing changes
- Support for multiple AI models (Claude, GPT, Gemini)
- File change analysis and patch parsing
- Configurable path filters for targeted reviews
- **File type specific prompts** for enhanced review quality
- Language-specific review support
- File content aware review capability

## Key Components

- **Code Review**: Analyzes diffs and provides specific, actionable feedback
- **Release Notes**: Automatically generates structured release notes from
  changes
- **Comment Management**: Posts review comments directly on the PR
- **Patch Analysis**: Smart parsing and analysis of code changes
- **Multi-model Support**: Flexible AI model selection for different tasks

## Usage

Add to your GitHub workflow `.github/workflows/pr-review.yml`:

```yaml
name: PR AI Review

on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - "**.ts"
      - "**.tsx"
      - "**.js"
      - "**.jsx"
      - "**.py"
      - "**.go"

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required to get proper diff

      - uses: mopemope/pr-ai-review-bot@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        with:
          model: |
            google/gemini-2.0-flash-exp
            openai/gpt-4o
          summary_model: |
            google/gemini-2.0-flash-exp
            openai/gpt-3.5-turbo
          use_file_content: true
```

## Configuration

For detailed configuration settings, please refer to [action.yml](action.yml).

| Option                    | Description                                                                | Default                                                                     |
| ------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `debug`                   | Enable debug logging                                                       | `false`                                                                     |
| `path_filters`            | Path filters for review (minimatch patterns), one per line                 | See [action.yml](action.yml) for default exclusion patterns                 |
| `disable_review`          | Skip code review                                                           | `false`                                                                     |
| `disable_release_notes`   | Skip release notes generation                                              | `false`                                                                     |
| `summary_model`           | Model for simple tasks like summarizing diffs                              | `openai/gpt-3.5-turbo`                                                      |
| `model`                   | Model for review tasks                                                     | `openai/gpt-4o`                                                             |
| `retries`                 | Number of retries for API calls                                            | `5`                                                                         |
| `timeout_ms`              | Timeout for API calls in milliseconds                                      | `360000` (6 minutes)                                                        |
| `release_notes_title`     | Title for the release notes                                                | `Key Changes`                                                               |
| `system_prompt`           | System message for LLM (see [action.yml](action.yml) for default template) | Detailed review prompt                                                      |
| `summarize_release_notes` | Prompt for generating release notes                                        | See [action.yml](action.yml) for default template                           |
| `use_file_content`        | Include full file content in review context                                | `false`                                                                     |
| `custom_review_policy`    | Custom policies for code review                                            | `""`                                                                        |
| `language`                | response language                                                          | `en-US`                                                                     |
| `comment_greeting`        | Greeting message for comments                                              | `Review bot comments:`                                                      |
| `ignore_keywords`         | Keywords to skip review (one per line)                                     | `@review-bot: ignore`, `@review-bot: no-review`, `@review-bot: skip-review` |
| `base_url`                | Specify the URL when using OpenAI-compatible API(OpenRouter)               | `""`                                                                        |
| `file_type_prompts`       | File type specific prompts in YAML format for enhanced review quality      | `""` (see [File Type Specific Prompts](#file-type-specific-prompts))        |

## File Type Specific Prompts

The `file_type_prompts` feature allows you to provide specialized review
guidelines for different programming languages and file types. This enhances the
AI's ability to provide relevant, language-specific feedback.

### Usage Example

```yaml
- name: AI Code Review
  uses: mopemope/pr-ai-review-bot@v1
  with:
    file_type_prompts: |
      javascript: |
        Focus on ES6+ best practices and modern JavaScript patterns.
        Check for proper async/await usage and error handling.
        Verify performance optimizations and security considerations.
        Look for potential memory leaks and proper event listener cleanup.

      python: |
        Focus on PEP8 compliance and Python best practices.
        Check for proper type hints and exception handling.
        Verify security vulnerabilities and performance issues.
        Look for proper use of context managers and generators.

      typescript: |
        Focus on type safety and TypeScript best practices.
        Check for proper interface definitions and generic usage.
        Verify strict mode compliance and null safety.
        Look for proper use of utility types and mapped types.

      go: |
        Focus on Go idioms and best practices.
        Check for proper error handling and goroutine usage.
        Verify memory efficiency and concurrency patterns.
        Look for proper use of channels and context.

      sql: |
        Focus on query optimization and security.
        Check for SQL injection vulnerabilities.
        Verify proper indexing and performance considerations.
        Look for proper use of transactions and constraints.
```

### Supported File Types

The system automatically detects file types based on extensions and filenames.
Supported types include:

- **Programming Languages**: `javascript`, `typescript`, `python`, `java`, `go`,
  `rust`, `cpp`, `c`, `php`, `ruby`, `swift`, `kotlin`, `scala`, `csharp`,
  `fsharp`
- **Web Technologies**: `html`, `css`, `scss`, `sass`, `less`
- **Data Formats**: `json`, `xml`, `yaml`, `toml`, `ini`
- **Database**: `sql`
- **Documentation**: `markdown`, `rst`, `latex`
- **Configuration**: `docker`, `shell`, `powershell`, `gitignore`, `env`
- **And many more...**

default system_prompt:

```text
You are a highly meticulous and logically rigorous software development assistant.
Your approach is characterized by strict validation, self-reflection, and iterative analysis, ensuring that your reviews are consistent and insightful.
You act as a highly experienced software engineer, performing in-depth reviews of modified code (code hunks) and providing concrete code snippets for improvement.

### Key Review Areas
You will analyze the following critical aspects to identify and resolve issues, improving overall code quality:

- Logical accuracy and soundness
- Security vulnerabilities and risks
- Performance and optimization
- Potential data races and concurrency issues
- Consistency and predictable behavior
- Appropriate error handling
- Maintainability and readability
- Modularity and reusability
- Complexity management (keeping the design simple and comprehensible)
- Best practices (e.g., DRY, SOLID, KISS, etc.)

### Areas to Avoid Commenting On
- Minor code style issues (e.g., indentation, naming conventions, etc.)
- Lack of comments or documentation

### Review Guidelines
- Maintain consistent evaluation criteria to ensure stable and reliable feedback.
- Focus on identifying and resolving significant issues while deliberately ignoring trivial ones.
- Provide specific improvement suggestions, including code snippets whenever possible.
- Deliver feedback based on deep analysis rather than surface-level observations.
```

## Specifying AI Models

This action supports multiple AI providers. When specifying models, you can use
either the short model name (which defaults to OpenAI) or the fully qualified
name with provider prefix.

### Model Format

Models are specified using the format: `provider/model_name` or simply
`model_name` .

### Supported Providers

- **OpenAI**: `openai/gpt-4`, `openai/gpt-3.5-turbo`, or just `gpt-4`,
  `gpt-3.5-turbo` ...
- **Google Gemini**: `google/gemini-pro`, `google/gemini-1.5-pro` ...
- **Anthropic Claude**: `anthropic/claude-3-haiku`, `anthropic/claude-3-sonnet`
- **OpenRouter**: `openrouter/deepseek/deepseek-chat:free`,
  `openrouter/mistralai/mistral-small-3.1-24b-instruct:free` ...

When using OpenRouter, please set the URL with the base_url option.

### Examples

```yaml
# Using OpenAI model (explicit provider)
model: openai/gpt-4o
summary_model: openai/gpt-4o

# Using Google Gemini model
model: google/gemini-pro
summary_model: google/gemini-1.5-pro

# Using Anthropic Claude model
model: anthropic/claude-3-sonnet
summary_model: anthropic/claude-3-haiku

# OpenRouter
model: openrouter/deepseek/deepseek-chat:free
summary_model: openrouter/deepseek/deepseek-chat:free

```

## Model Fallback Mechanism

This action includes a robust model fallback system to ensure reliability in
case of API failures or model-specific issues:

- If the primary model fails (e.g., due to API errors, rate limits, context
  limitations), the action will automatically attempt to use fallback models.
- The fallback order follows the sequence specified in the model configuration.

### How Fallback Works

- **API Errors**: If an API call fails with a specific model, the system will
  retry with an alternative model after the configured number of retries.
- **Context Limitations**: If a large review exceeds the context window of the
  primary model, a model with larger context capacity may be used if available.
- **Provider Issues**: If a specific provider is experiencing downtime, the
  system can switch to alternative providers if multiple API keys are
  configured.

This mechanism ensures that your PR reviews continue to function even when
specific models or providers experience temporary issues, maximizing the
reliability of your automated review workflow.

### API Keys

Make sure to provide the appropriate API keys as environment variables:

- OpenAI(OpenRouter): `OPENAI_API_KEY`
- Google Gemini: `GEMINI_API_KEY`
- Anthropic Claude: `ANTHROPIC_API_KEY`

## Acknowledgment

This GitHub Action is based on
[coderabbitai/ai-pr-reviewer](https://github.com/coderabbitai/ai-pr-reviewer)
and has been further developed with additional features and improvements.
