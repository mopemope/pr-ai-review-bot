/**
 * Class that holds context information for a pull request
 * Stores pull request related data and handles chatbot creation
 */
export declare class PullRequestContext {
    /** Repository owner name */
    owner: string;
    /** Pull request title */
    title: string;
    /** Pull request description (optional) */
    description: string;
    /** Summary of the pull request (optional) */
    summary: string;
    /** Repository name */
    repo: string;
    /** Pull request number */
    pullRequestNumber: number;
    /** Base commit ID from which PR changes are compared */
    baseCommitId: string;
    /** Last commit ID that was reviewed */
    lastReviewCommitId: string;
    /** Head commit ID representing the latest commit in the PR */
    headCommitId: string;
    /** Array of file summaries in markdown format */
    fileSummaries: string[];
    summaryCommentId?: number;
    /**
     * Creates an instance of PullRequestContext
     *
     * @param owner Repository owner name
     * @param title Pull request title
     * @param repo Repository name
     * @param description Pull request description (body text)
     * @param pullRequestNumber Pull request number identifier
     * @param baseCommitId Base commit ID from which PR changes are compared
     * @param headCommitId Latest commit ID in the PR
     */
    constructor(owner: string, title: string, repo: string, description: string, pullRequestNumber: number, baseCommitId: string, headCommitId: string);
    /**
     * Appends a file change summary to the fileSummaries array
     * Each summary is formatted as markdown with the file name as a heading
     *
     * @param file File name or path to be included in the heading
     * @param summary Summary of changes for the file in markdown format
     */
    appendChangeSummary(file: string, summary: string): void;
    /**
     * Returns a combined string of all file summaries
     * Joins all file summaries with newlines to create a complete markdown document
     *
     * @returns Markdown formatted string containing all file change summaries
     */
    getChangeSummary(): string;
    /**
     * Generates a markdown formatted summary of commits in the pull request
     * Creates a collapsible details section containing commit range information
     *
     * @returns Markdown formatted string with commit summary information
     */
    getCommitSummary(): string;
}
