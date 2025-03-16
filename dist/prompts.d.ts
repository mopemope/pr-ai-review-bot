import type { Message } from "./chatbot/index.js";
import type { PullRequestContext } from "./context.js";
import type { Options } from "./option.js";
import type { ChangeFile, FileDiff } from "./types.js";
/**
 * Class responsible for generating and managing prompts used for PR reviews.
 * Handles the templating of review prompts with contextual information.
 */
export declare class Prompts {
    private options;
    private summarizePrefix;
    private summarizeReleaseNote;
    private footer;
    /**
     * Creates a new Prompts instance with the specified options and template settings.
     * @param options - Configuration options for the PR reviewer
     * @param footer - Custom footer text to append to prompts (defaults to a predefined footer)
     * @param summarizePrefix - Custom prefix for summary prompts (defaults to a predefined prefix)
     */
    constructor(options: Options);
    /**
     * Renders a prompt to generate a release note based on the provided change summary.
     * @param message - The change summary to include in the release note prompt
     * @returns Formatted release note prompt string with the change summary inserted
     */
    renderSummarizeReleaseNote(message: string): Message[];
    /**
     * Renders a summary prompt for a specific file change in a pull request.
     * @param ctx - Pull request context containing metadata like title and description
     * @param change - File change information with patch content
     * @returns Formatted summary prompt string with all placeholders replaced
     */
    renderSummarizeFileDiff(ctx: PullRequestContext, change: ChangeFile): Message[];
    /**
     * Renders a review prompt for a specific file change in a pull request.
     * @param ctx - Pull request context containing metadata like title and description
     * @param diff - File change information with diff content
     * @returns Formatted review prompt string with all placeholders replaced
     */
    renderReviewPrompt(ctx: PullRequestContext, change: ChangeFile, diff: FileDiff): Message[];
    /**
     * Renders a template string by replacing placeholders with provided values.
     * @param template - Template string containing placeholders in the format $key or ${key}
     *                  and conditional blocks in the format $if(condition){trueContent}$else{falseContent}
     * @param values - Object containing key-value pairs for placeholder replacement
     * @param addFooter - Whether to append the footer to the template (defaults to false)
     * @returns Formatted string with all placeholders replaced and footer appended if requested
     */
    renderTemplate(template: string, values: Record<string, string>, addFooter?: boolean): string;
    /**
     * Evaluates a condition string against provided values
     * @param condition - Condition string like "key == 'value'" or "key"
     * @param values - Values to be used in evaluation
     * @returns Boolean result of condition evaluation
     */
    private evaluateCondition;
    /**
     * Outputs debug information about the current options.
     * Uses the debug function from @actions/core.
     */
    debug(): void;
}
export declare const renderFileDiffHunk: (diff: FileDiff) => string;
