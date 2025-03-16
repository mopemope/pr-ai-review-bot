# GitHub Actions for AI PR Reviewer and Summarizer

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

      - uses: mopemope/pr-ai-review-bot@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        with:
          model: openai/gpt-google/gemini-2.0-flash-exp
          summary_model: google/gemini-2.0-flash-exp
          language: en-US
          use_file_content: true
```

## Configuration

see `action.yml`.

| Option                  | Description                         | Default                |
| ----------------------- | ----------------------------------- | ---------------------- |
| `debug`                 | Enable debug logging                | `false`                |
| `disable_review`        | Skip code review                    | `false`                |
| `disable_release_notes` | Skip release notes generation       | `false`                |
| `system_prompt`         | Custom prompt for AI reviewer       | Default system prompt  |
| `language`              | Review comments language            | `en-US`                |
| `model`                 | AI model for code review            | `openai/gpt-4o`        |
| `summary_model`         | AI model for summaries              | `openai/gpt-3.5-turbo` |
| `use_file_content`      | Include full file content in review | `false`                |

## Specifying AI Models

This action supports multiple AI providers. When specifying models, you can use
either the short model name (which defaults to OpenAI) or the fully qualified
name with provider prefix.

### Model Format

Models are specified using the format: `provider/model_name` or simply
`model_name` (defaults to OpenAI).

### Supported Providers

- **OpenAI**: `openai/gpt-4`, `openai/gpt-3.5-turbo`, or just `gpt-4`,
  `gpt-3.5-turbo` ...
- **Google Gemini**: `google/gemini-pro`, `google/gemini-1.5-pro` ...
- **Anthropic Claude**: `anthropic/claude-3-haiku`, `anthropic/claude-3-sonnet`
  ...

### Examples

```yaml
# Using OpenAI model (explicit provider)
model: openai/gpt-4o

# Using Google Gemini model
model: google/gemini-pro
summary_model: google/gemini-1.5-pro

# Using Anthropic Claude model
model: anthropic/claude-3-sonnet
summary_model: anthropic/claude-3-haiku
```

### API Keys

Make sure to provide the appropriate API keys as environment variables:

- OpenAI: `OPENAI_API_KEY`
- Google Gemini: `GEMINI_API_KEY`
- Anthropic Claude: `ANTHROPIC_API_KEY`

## Acknowledgment

This GitHub Action is based on
[coderabbitai/ai-pr-reviewer](https://github.com/coderabbitai/ai-pr-reviewer)
and has been further developed with additional features and improvements.
