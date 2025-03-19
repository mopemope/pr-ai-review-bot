import { type ChatBot, Message } from "./chatbot/index.js";
import type { Commenter } from "./commenter.js";
import type { PullRequestContext } from "./context.js";
import type { Options } from "./option.js";
import type { Prompts } from "./prompts.js";
import type { ChangeFile } from "./types.js";
export type ReviewComment = {
    filename: string;
    startLine: number;
    endLine: number;
    comment: string;
    isLGTM: boolean;
};
/**
 * Reviewer class responsible for performing code reviews using a chatbot.
 * It initializes with configuration options and creates the appropriate chatbot instance.
 */
export declare class Reviewer {
    /**
     * Configuration options for the reviewer.
     * @private
     */
    private options;
    /**
     * Commenter instance used to post review comments to GitHub.
     * @private
     */
    private commenter;
    /**
     * ChatBot instance used for generating summaries of changes.
     * @private
     */
    private summaryBot;
    /**
     * The chatbot instance used for generating review comments.
     * @private
     */
    private reviewBot;
    /**
     * Creates a new Reviewer instance.
     * @param octokit - GitHub API client instance
     * @param commenter - Commenter instance for posting comments
     * @param options - Configuration options for the reviewer and chatbot
     */
    constructor(commenter: Commenter, options: Options);
    getSummaryBot(): ChatBot | undefined;
    fallbackSummaryBot(): void;
    getReviewBot(): ChatBot | undefined;
    fallbackReviewBot(): void;
    createSummary(prContext: PullRequestContext, prompts: Message[]): Promise<string>;
    createReview(prContext: PullRequestContext, prompts: Message[]): Promise<string>;
    /**
     * Generates summaries for each file change in a pull request and creates an overall release note.
     * It processes all files sequentially, generating individual file summaries before creating a consolidated release note.
     *
     * @param prContext - Context information about the pull request
     * @param prompts - Prompt templates for generating summaries
     * @param changes - List of files changed in the pull request
     * @returns A promise that resolves to a string containing the generated release note summary
     */
    summarizeChanges({ prContext, prompts, changes }: {
        prContext: PullRequestContext;
        prompts: Prompts;
        changes: ChangeFile[];
    }): Promise<string>;
    /**
     * Reviews code changes in a pull request and posts review comments.
     * Analyzes each changed file and its diffs, generates review comments using the chatbot,
     * and posts any non-LGTM comments as review comments via the commenter.
     * The method processes files sequentially, and for each file, processes all diffs.
     *
     * @param prContext - Context information about the pull request
     * @param prompts - Prompt templates for generating reviews
     * @param changes - List of files changed in the pull request
     * @returns A promise that resolves when all reviews are completed and comments are posted
     */
    reviewChanges({ prContext, prompts, changes }: {
        prContext: PullRequestContext;
        prompts: Prompts;
        changes: ChangeFile[];
    }): Promise<ReviewComment[]>;
}
/**
 * Parses the review comment string and extracts structured review data.
 * The function splits the comment by "---" separators and extracts line numbers
 * and comment content for each section. Comments containing "LGTM!" are flagged.
 *
 * @param filename - The name of the file being reviewed
 * @param reviewComment - The raw review comment string to parse
 * @returns Array of ReviewComment objects containing structured review data
 */
export declare const parseReviewComment: (filename: string, reviewComment: string) => ReviewComment[];
