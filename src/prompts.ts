import { debug } from "@actions/core"
import type { Message } from "./chatbot/index.js"
import type { PullRequestContext } from "./context.js"
import type { Options } from "./option.js"
import type { ChangeFile, FileDiff } from "./types.js"

const defaultFooter = `
## IMPORTANT:
We will communicate in $language.
`

const defalutSummarizePrefix = `Here is the summary of changes you have generated for files:

\`\`\`
$changeSummary
\`\`\`

`

const summarizeReleaseNote = `
Generate concise and structured release notes for a Pull Request.  
Focus on the purpose and user impact, categorizing changes into one of the following:  
"New Feature", "Bug Fix", "Documentation", "Refactor", "Style", "Test", "Chore", or "Revert".  

The output format must strictly follow this pattern:  
- [Category]: [Change description]

Please write only in bullet points.

Example:  
- New Feature: Added search functionality to the UI  
- Bug Fix: Fixed an error occurring during login  

Limit the response to 50–100 words. Clearly highlight changes that affect end users, and exclude code-level details or technical explanations. 
`

/**
 * Template for the pull request review prompt.
 * Contains placeholders for title, description, summary, filename, and patches.
 * Provides instructions for the AI reviewer on how to format responses.
 */
const reviewFileDiffPrefix = `
## GitHub PR Title

\`$title\`

## Description

\`\`\`
$description
\`\`\`

$if(content) {
## File Content Data (Ignore if no content data exists.)

\`\`\`
$content
\`\`\`
}
## Summary of changes

\`\`\`
$changeSummary
\`\`\`

if($reviewPolicy) {
## Review Policy
\`\`\`
$reviewPolicy
\`\`\`
}
## IMPORTANT Instructions

Input: New hunks annotated with line numbers and old hunks (replaced code). Hunks represent incomplete code fragments.
Additional Context: PR title, description, summaries, file content, review policy and comment chains.
Task: Review new hunks for substantive issues using provided context and respond with comments if necessary.
Output: Review comments in markdown with exact line number ranges in new hunks. Start and end line numbers must be within the same hunk. For single-line comments, start=end line number. Must use example response format below.
Use fenced code blocks using the relevant language identifier where applicable.
Don't annotate code snippets with line numbers. Format and indent code correctly.
Do not use \`suggestion\` code blocks.
For fixes, use \`diff\` code blocks, marking changes with \`+\` or \`-\`. The line number range for comments with fix snippets must exactly match the range to replace in the new hunk.

Suggest improvements and explain your reasoning for each suggestion.
- Do NOT provide general feedback, summaries, explanations of changes, or praises
  for making good additions.
- Focus solely on offering specific, objective insights based on the
  given context and refrain from making broad comments about potential impacts on
  the system or question intentions behind the changes.

If there are no issues found on a line range, you MUST respond with the
text \`LGTM!\` for that line range in the review section.

## Example

### Example changes

---new_hunk---
\`\`\`
  z = x / y
    return z

20: def add(x, y):
21:     z = x + y
22:     retrn z
23:
24: def multiply(x, y):
25:     return x * y

def subtract(x, y):
  z = x - y
\`\`\`

---old_hunk---
\`\`\`
  z = x / y
    return z

def add(x, y):
    return x + y

def subtract(x, y):
    z = x - y
\`\`\`

---comment_chains---
\`\`\`
Please review this change.
\`\`\`

---end_change_section---

### Example response

22-22:
There's a syntax error in the add function.
\`\`\`diff
-    retrn z
+    return z
\`\`\`
---
24-25:
LGTM!
---

`

const reviewFileDiff = `
## Changes made to \`$filename\` for your review

$patches
`

const summarizeFileDiffPrefix = `
## GitHub PR Title

\`$title\`

## Description

\`\`\`
$description
\`\`\`
$if(content) {
## File Content Data (Ignore if no content data exists.)

\`\`\`
$content
\`\`\`
}
## Instructions
Analyze the provided patch format file diff and summarize it according to the following instructions:

1. Summarize the contents of the diff in 3 bullet points or less.
2. If there are changes to the signatures of exported functions, global data structures, or variables, describe them specifically.
3. If the purpose of the diff changes can be clearly read from the patch content, include the purpose in one line in the summary. If the purpose is unclear, the purpose description is unnecessary.
4. Output only the summary, and no additional explanations or comments are needed.

**Output format:**

* [Summary 1]
* [Summary 2]
* [Summary 3]
* [Summary 4]
* [Summary 5]

`

const summarizeFileDiff = `
## Diff

$filename

$patch

`

/**
 * Class responsible for generating and managing prompts used for PR reviews.
 * Handles the templating of review prompts with contextual information.
 */
export class Prompts {
  private options: Options
  private summarizePrefix: string = defalutSummarizePrefix
  private summarizeReleaseNote: string
  private footer: string = defaultFooter

  /**
   * Creates a new Prompts instance with the specified options and template settings.
   * @param options - Configuration options for the PR reviewer
   * @param footer - Custom footer text to append to prompts (defaults to a predefined footer)
   * @param summarizePrefix - Custom prefix for summary prompts (defaults to a predefined prefix)
   */
  constructor(options: Options) {
    this.options = options
    this.summarizeReleaseNote = summarizeReleaseNote
  }

  /**
   * Renders a prompt to generate a release note based on the provided change summary.
   * @param message - The change summary to include in the release note prompt
   * @returns Formatted release note prompt string with the change summary inserted
   */
  renderSummarizeReleaseNote(message: string): Message[] {
    const prompts: Message[] = []
    const data = {
      changeSummary: message
    }

    prompts.push({
      role: "user",
      text: this.renderTemplate(
        this.summarizePrefix + this.summarizeReleaseNote,
        data,
        true
      ),
      cache: true
    })

    return prompts
  }

  /**
   * Renders a summary prompt for a specific file change in a pull request.
   * @param ctx - Pull request context containing metadata like title and description
   * @param change - File change information with patch content
   * @returns Formatted summary prompt string with all placeholders replaced
   */
  renderSummarizeFileDiff(
    ctx: PullRequestContext,
    change: ChangeFile
  ): Message[] {
    const prompts: Message[] = []

    const data = {
      title: ctx.title,
      description: ctx.description || "",
      filename: change.filename || "",
      content: this.options.useFileContent ? change.content || "" : "",
      patch: change.patch
    }

    // cache the first prompt
    prompts.push({
      role: "user",
      text: this.renderTemplate(summarizeFileDiffPrefix, data),
      cache: true
    })

    // diff
    prompts.push({
      role: "user",
      text: this.renderTemplate(summarizeFileDiff, data, true)
    })
    return prompts
  }

  /**
   * Renders a review prompt for a specific file change in a pull request.
   * @param ctx - Pull request context containing metadata like title and description
   * @param diff - File change information with diff content
   * @returns Formatted review prompt string with all placeholders replaced
   */
  renderReviewPrompt(
    ctx: PullRequestContext,
    change: ChangeFile,
    diff: FileDiff
  ): Message[] {
    const prompts: Message[] = []
    const data = {
      title: ctx.title,
      description: ctx.description || "",
      filename: diff.filename || "",
      changeSummary: change.summary,
      content: this.options.useFileContent ? change.content || "" : "",
      patches: renderFileDiffHunk(diff),
      reviewPolicy: this.options.reviewPolicy || ""
    }

    // cache the first prompt
    prompts.push({
      role: "user",
      text: this.renderTemplate(reviewFileDiffPrefix, data),
      cache: true
    })
    // diff
    prompts.push({
      role: "user",
      text: this.renderTemplate(reviewFileDiff, data, true)
    })
    return prompts
  }

  /**
   * Renders a template string by replacing placeholders with provided values.
   * @param template - Template string containing placeholders in the format $key or ${key}
   *                  and conditional blocks in the format $if(condition){trueContent}$else{falseContent}
   * @param values - Object containing key-value pairs for placeholder replacement
   * @param addFooter - Whether to append the footer to the template (defaults to false)
   * @returns Formatted string with all placeholders replaced and footer appended if requested
   */
  renderTemplate(
    template: string,
    values: Record<string, string>,
    addFooter = false
  ): string {
    values.language = this.options.language || "en-US"
    // add footer
    // Add footer if requested
    let result = addFooter ? `${template}\n\n---\n${this.footer}` : template

    let previousResult: string
    do {
      previousResult = result
      // Process conditional blocks
      // Pattern to match if/else blocks and simple if blocks
      // Handle if-else blocks
      // Process if-else blocks first
      result = result.replace(
        /\$if\(([^)]+)\){([^{}]*)}\$else{([^{}]*)}/g,
        (
          match: string,
          condition: string,
          trueContent: string,
          falseContent: string
        ) => {
          try {
            if (
              !/^(?:[a-zA-Z_][a-zA-Z0-9_]*(?:\s*==\s*(?:'[^']*'|"[^"]*"))?)\s*$/.test(
                condition.trim()
              )
            ) {
              return match
            }
            return this.evaluateCondition(condition, values)
              ? trueContent
              : falseContent
          } catch (error) {
            debug(`Error evaluating condition: ${condition}, ${error}`)
            return match
          }
        }
      )

      // Then process simple if blocks
      result = result.replace(
        /\$if\(([^)]+)\){([^{}]*)}/g,
        (match: string, condition: string, content: string) => {
          try {
            // Check if the condition is valid
            if (
              !/^(?:[a-zA-Z_][a-zA-Z0-9_]*(?:\s*==\s*(?:'[^']*'|"[^"]*"))?)\s*$/.test(
                condition.trim()
              )
            ) {
              return match
            }
            return this.evaluateCondition(condition, values) ? content : ""
          } catch (error) {
            debug(`Error evaluating condition: ${condition}, ${error}`)
            return match
          }
        }
      )

      // Replace variables with both formats
      for (const [key, value] of Object.entries(values)) {
        if (value !== undefined) {
          const regex1 = new RegExp(`\\$${key}\\b`, "g")
          const regex2 = new RegExp(`\\$\\{${key}\\}`, "g")
          result = result.replace(regex1, value)
          result = result.replace(regex2, value)
        }
      }
    } while (result !== previousResult) // Continue until no more changes are made

    return result
  }

  /**
   * Evaluates a condition string against provided values
   * @param condition - Condition string like "key == 'value'" or "key"
   * @param values - Values to be used in evaluation
   * @returns Boolean result of condition evaluation
   */
  private evaluateCondition(
    condition: string,
    values: Record<string, string>
  ): boolean {
    const trimmedCondition = condition.trim()

    if (trimmedCondition.includes("==")) {
      const [key, valueToCompare] = trimmedCondition
        .split("==")
        .map((part) => part.trim())
      const actualValue = values[key] || ""
      const expectedValue = valueToCompare.replace(/^["'](.*)["']$/, "$1")
      return actualValue === expectedValue
    }

    return !!values[trimmedCondition]
  }

  /**
   * Outputs debug information about the current options.
   * Uses the debug function from @actions/core.
   */
  debug(): void {
    debug(`Options: ${JSON.stringify(this.options)}`)
  }
}

export const renderFileDiffHunk = (diff: FileDiff): string => {
  const fromContent = diff.from.content.join("\n")
  const toContent = diff.to.content.join("\n")

  return `---new_hunk---\n\`\`\`\n${toContent}\n\`\`\`\n\n---old_hunk---\n\`\`\`\n${fromContent}\n\`\`\``
}
