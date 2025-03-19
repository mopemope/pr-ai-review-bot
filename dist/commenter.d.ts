import type { GitHub } from "@actions/github/lib/utils.js";
import type { PullRequestContext } from "./context.js";
import type { Options } from "./option.js";
import type { ReviewComment } from "./reviewer.js";
import type { ChangeFile } from "./types.js";
/**
 * Represents a comment on a GitHub issue
 */
export type IssueComment = {
    id: number;
    node_id: string;
    url: string;
    html_url: string;
    body: string;
    created_at: string;
    updated_at: string;
};
export declare const COMMENT_TAG = "<!-- This is an auto-generated comment -->";
export declare const SUMMARIZE_TAG = "<!-- This is an auto-generated comment: summarize -->";
export declare const DESCRIPTION_START_TAG = "<!-- This is an auto-generated comment: release notes -->";
export declare const DESCRIPTION_END_TAG = "<!-- end of auto-generated comment: release notes -->";
export declare const COMMIT_ID_START_TAG = "<!-- commit_ids_reviewed_start -->";
export declare const COMMIT_ID_END_TAG = "<!-- commit_ids_reviewed_end -->";
export declare const REVIEW_START_TAG = "<!-- This is an auto-generated comment: code review -->";
export declare const REVIEW_END_TAG = "<!-- end of auto-generated comment: code review -->";
/**
 * Handles creation and management of comments on GitHub pull requests
 */
export declare class Commenter {
    private options;
    private octokit;
    private prContext;
    private issueCommentsCache;
    private greeting;
    constructor(options: Options, octokit: InstanceType<typeof GitHub>, prContext: PullRequestContext);
    /**
     * Extracts the commit IDs from the comment body that were previously reviewed.
     *
     * @param commentBody - The body of the comment to parse
     * @returns An array of commit IDs that were previously reviewed
     */
    getReviewedCommitIds(commentBody: string): string[];
    /**
     * Extracts the block containing reviewed commit IDs from the comment body.
     *
     * @param commentBody - The body of the comment to parse
     * @returns The entire block containing commit IDs including start and end tags, or empty string if not found
     */
    getReviewedCommitIdsBlock(commentBody: string): string;
    /**
     * Creates or updates a comment on the pull request.
     *
     * @param options - Comment options including message text, tag, and operation mode
     * @param options.message - The content of the comment
     * @param options.tag - The tag to identify the comment (defaults to COMMENT_TAG)
     * @param options.mode - The operation mode: 'create' to create a new comment, 'update' to update an existing comment
     * @param options.commentId - The ID of the comment to update (required when mode is 'update')
     * @returns A promise that resolves when the comment operation is complete
     */
    comment({ message, tag, mode, commentId }?: {
        message: string;
        tag?: string;
        mode?: string;
        commentId?: number;
    }): Promise<void>;
    /**
     * Creates a new comment on the pull request.
     *
     * @param body - The content of the comment to create
     * @returns A promise that resolves when the comment is created
     */
    createComment(body: string): Promise<void>;
    /**
     * Updates an existing comment on the pull request.
     *
     * @param body - The new content for the comment
     * @param commentId - The ID of the comment to update
     * @returns A promise that resolves when the comment is updated
     */
    updateComment(body: string, commentId: number): Promise<void>;
    /**
     * Finds a comment containing a specific text in the provided target.
     *
     * @param search - The text to search for within comments
     * @param target - The issue/PR number to search comments in
     * @returns The matching comment or null if not found
     */
    findComment(search: string, target: number): Promise<IssueComment | null>;
    /**
     * Retrieves all comments for a given issue/PR number.
     * Uses a cache to avoid repeated API calls for the same target.
     *
     * @param target - The issue/PR number to get comments for
     * @returns A promise resolving to an array of comments
     */
    listComments(target: number): Promise<IssueComment[]>;
    /**
     * Retrieves all commit IDs for the current pull request.
     *
     * @returns A promise resolving to an array of commit SHA strings
     */
    getAllCommitIds(): Promise<string[]>;
    /**
     * Updates the pull request description with a provided message.
     * The message is wrapped between special tags to be identifiable.
     *
     * @param message - The content to add to the PR description
     * @returns A Promise that resolves when the description is updated
     */
    updateDescription(message: string): Promise<void>;
    /**
     * Creates a review comment on a specific file in a pull request.
     *
     * @param filename - The path of the file to comment on
     * @param review - The review comment object containing comment text and line information
     * @returns A Promise that resolves when the comment is successfully created
     */
    createReviewComment(filename: string, review: ReviewComment): Promise<void>;
    /**
     * Extracts the original description by removing any content that was
     * previously added between the defined tags.
     *
     * @param description - The full description text of the pull request
     * @returns The description text without any auto-generated content
     */
    getDescription(description: string): string;
    /**
     * Removes any content found between the specified start and end tags.
     *
     * @param content - The string to process
     * @param startTag - The opening tag marking the beginning of content to remove
     * @param endTag - The closing tag marking the end of content to remove
     * @returns The content string with the tagged section removed
     */
    removeContentWithinTags(content: string, startTag: string, endTag: string): string;
    /**
     * Adds a commit ID to the list of reviewed commits in a comment.
     * If the commit ID tags don't exist in the comment, they will be added.
     *
     * @param comment - The comment text to add the commit ID to
     * @param commitId - The commit ID (SHA) to add to the comment
     * @returns The updated comment text with the commit ID included
     */
    addReviewedCommitId(comment: string, commitId: string): string;
    /**
     * Posts a summary of the pull request as a comment.
     * Includes the commit summary and a collapsible list of changed files.
     *
     * @param changeFiles - Array of files changed in the pull request
     * @returns A Promise that resolves when the summary comment is created or updated
     */
    postPullRequestSummary(changeFiles: ChangeFile[]): Promise<void>;
}
