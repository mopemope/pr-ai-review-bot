import { debug, warning } from "@actions/core"
import type { GitHub } from "@actions/github/lib/utils.js"
import type { PullRequestContext } from "./context.js"
import type { Options } from "./option.js"
import type { ReviewComment } from "./reviewer.js"
import type { ChangeFile } from "./types.js"

/**
 * Represents a comment on a GitHub issue
 */
export type IssueComment = {
  id: number
  node_id: string
  url: string
  html_url: string
  body: string
  created_at: string
  updated_at: string
}

export const COMMENT_TAG = "<!-- This is an auto-generated comment -->"

export const SUMMARIZE_TAG =
  "<!-- This is an auto-generated comment: summarize -->"

export const DESCRIPTION_START_TAG =
  "<!-- This is an auto-generated comment: release notes -->"
export const DESCRIPTION_END_TAG =
  "<!-- end of auto-generated comment: release notes -->"

export const COMMIT_ID_START_TAG = "<!-- commit_ids_reviewed_start -->"
export const COMMIT_ID_END_TAG = "<!-- commit_ids_reviewed_end -->"

export const REVIEW_START_TAG =
  "<!-- This is an auto-generated comment: code review -->"
export const REVIEW_END_TAG =
  "<!-- end of auto-generated comment: code review -->"

/**
 * Handles creation and management of comments on GitHub pull requests
 */
export class Commenter {
  private options: Options
  private octokit: InstanceType<typeof GitHub>
  private prContext: PullRequestContext
  private issueCommentsCache: Record<number, IssueComment[]> = {}
  private greeting: string

  constructor(
    options: Options,
    octokit: InstanceType<typeof GitHub>,
    prContext: PullRequestContext
  ) {
    this.options = options
    this.octokit = octokit
    this.prContext = prContext
    this.greeting = options.commentGreeting
  }

  /**
   * Extracts the commit IDs from the comment body that were previously reviewed.
   *
   * @param commentBody - The body of the comment to parse
   * @returns An array of commit IDs that were previously reviewed
   */
  getReviewedCommitIds(commentBody: string): string[] {
    const start = commentBody.indexOf(COMMIT_ID_START_TAG)
    const end = commentBody.indexOf(COMMIT_ID_END_TAG)
    if (start === -1 || end === -1) {
      return []
    }
    const ids = commentBody.substring(start + COMMIT_ID_START_TAG.length, end)
    // remove the <!-- and --> markers from each id and extract the id and remove empty strings
    return ids
      .split("<!--")
      .map((id) => id.replace("-->", "").trim())
      .filter((id) => id !== "")
  }

  /**
   * Extracts the block containing reviewed commit IDs from the comment body.
   *
   * @param commentBody - The body of the comment to parse
   * @returns The entire block containing commit IDs including start and end tags, or empty string if not found
   */
  getReviewedCommitIdsBlock(commentBody: string): string {
    const start = commentBody.indexOf(COMMIT_ID_START_TAG)
    const end = commentBody.indexOf(COMMIT_ID_END_TAG)
    if (start === -1 || end === -1) {
      return ""
    }
    return commentBody.substring(start, end + COMMIT_ID_END_TAG.length)
  }

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
  async comment(
    {
      message,
      tag,
      mode,
      commentId
    }: {
      message: string
      tag?: string
      mode?: string
      commentId?: number
    } = {
      message: "",
      tag: COMMENT_TAG,
      mode: "create",
      commentId: undefined
    }
  ) {
    if (!tag) {
      tag = COMMENT_TAG
    }

    const body = `${this.greeting}

${message}

${tag}`

    debug(`comment in ${mode} mode. comment id: ${commentId}`)

    if (mode === "create") {
      await this.createComment(body)
    } else if (mode === "update" && commentId) {
      await this.updateComment(body, commentId)
    } else {
      throw new Error(`invalid comment condition: ${mode}`)
    }
  }

  /**
   * Creates a new comment on the pull request.
   *
   * @param body - The content of the comment to create
   * @returns A promise that resolves when the comment is created
   */
  async createComment(body: string) {
    debug(
      `create comment: ${this.prContext.owner}/${this.prContext.repo}
body:
${body}`
    )
    const target = this.prContext.pullRequestNumber
    try {
      // get comment ID from the response
      const response = await this.octokit.rest.issues.createComment({
        owner: this.prContext.owner,
        repo: this.prContext.repo,
        issue_number: target,
        body
      })

      const issue = {
        id: response.data.id,
        node_id: response.data.node_id,
        url: response.data.url,
        html_url: response.data.html_url,
        body: response.data.body || "",
        created_at: response.data.created_at,
        updated_at: response.data.updated_at
      }
      // add comment to issueCommentsCache
      if (this.issueCommentsCache[target]) {
        this.issueCommentsCache[target].push(issue)
      } else {
        this.issueCommentsCache[target] = [issue]
      }
    } catch (e) {
      warning(`Failed to create comment: ${e}`)
    }
  }

  /**
   * Updates an existing comment on the pull request.
   *
   * @param body - The new content for the comment
   * @param commentId - The ID of the comment to update
   * @returns A promise that resolves when the comment is updated
   */
  async updateComment(body: string, commentId: number) {
    debug(
      `updating comment: ${commentId} in ${this.prContext.owner}/${this.prContext.repo}
body:
${body}`
    )
    const issueNumber = this.prContext.pullRequestNumber
    try {
      // get comment ID from the response
      const response = await this.octokit.rest.issues.updateComment({
        owner: this.prContext.owner,
        repo: this.prContext.repo,
        comment_id: commentId,
        body
      })

      const issue = {
        id: response.data.id,
        node_id: response.data.node_id,
        url: response.data.url,
        html_url: response.data.html_url,
        body: response.data.body || "",
        created_at: response.data.created_at,
        updated_at: response.data.updated_at
      }

      debug(
        `Comment updated: ${issue.html_url} id: ${issue.id} body: ${issue.body}`
      )

      // add comment to issueCommentsCache
      if (this.issueCommentsCache[issueNumber]) {
        this.issueCommentsCache[issueNumber].push(issue)
      } else {
        this.issueCommentsCache[issueNumber] = [issue]
      }
    } catch (e) {
      warning(`Failed to create comment: ${e}`)
    }
  }

  /**
   * Finds a comment containing a specific text in the provided target.
   *
   * @param search - The text to search for within comments
   * @param target - The issue/PR number to search comments in
   * @returns The matching comment or null if not found
   */
  async findComment(search: string, target: number) {
    try {
      const comments = await this.listComments(target)
      for (const cmt of comments) {
        if (cmt.body?.includes(search)) {
          return cmt
        }
      }

      return null
    } catch (e: unknown) {
      warning(`Failed to find comment with tag: ${e}`)
      return null
    }
  }

  /**
   * Retrieves all comments for a given issue/PR number.
   * Uses a cache to avoid repeated API calls for the same target.
   *
   * @param target - The issue/PR number to get comments for
   * @returns A promise resolving to an array of comments
   */
  async listComments(target: number): Promise<IssueComment[]> {
    if (this.issueCommentsCache[target]) {
      return this.issueCommentsCache[target]
    }

    const allComments: IssueComment[] = []
    let page = 1
    try {
      for (;;) {
        const response = await this.octokit.rest.issues.listComments({
          owner: this.prContext.owner,
          repo: this.prContext.repo,
          issue_number: target,
          page,
          per_page: 100
        })

        if (response.status === 200) {
          const comments = response.data
          const typedComments: IssueComment[] = comments.map((comment) => ({
            id: comment.id,
            node_id: comment.node_id,
            url: comment.url,
            html_url: comment.html_url,
            body: comment.body || "",
            created_at: comment.created_at,
            updated_at: comment.updated_at
          }))

          allComments.push(...typedComments)
          page++
          if (!comments || comments.length < 100) {
            break
          }
        } else {
          warning(`Failed to list comments: ${response.status}`)
          break
        }
      }

      this.issueCommentsCache[target] = allComments
      return allComments
    } catch (e: unknown) {
      warning(
        `Failed to list comments: ${e instanceof Error ? e.message : String(e)}`
      )
      return allComments
    }
  }

  /**
   * Retrieves all commit IDs for the current pull request.
   *
   * @returns A promise resolving to an array of commit SHA strings
   */
  async getAllCommitIds(): Promise<string[]> {
    const allCommits: string[] = []
    let page = 1
    let commits = null
    do {
      const response = await this.octokit.rest.pulls.listCommits({
        owner: this.prContext.owner,
        repo: this.prContext.repo,
        pull_number: this.prContext.pullRequestNumber,
        per_page: 100,
        page
      })

      if (response.status !== 200) {
        warning(`Failed to list commits: ${response.status}`)
        break
      }
      commits = response.data
      allCommits.push(...commits.map((commit) => commit.sha))
      page++
    } while (commits.length > 0)

    return allCommits
  }

  /**
   * Updates the pull request description with a provided message.
   * The message is wrapped between special tags to be identifiable.
   *
   * @param message - The content to add to the PR description
   * @returns A Promise that resolves when the description is updated
   */
  async updateDescription(message: string) {
    const { owner, repo, pullRequestNumber } = this.prContext
    const pr = await this.octokit.rest.pulls.get({
      owner: owner,
      repo: repo,
      pull_number: pullRequestNumber
    })
    // Get the current description of the pull request
    const body = pr.data.body || ""
    const description = this.getDescription(body)
    const cleaned = this.removeContentWithinTags(
      message,
      DESCRIPTION_START_TAG,
      DESCRIPTION_END_TAG
    )

    // Append the new content to the existing description
    const newDescription = `${description}\n${DESCRIPTION_START_TAG}\n### ${this.options.releaseNotesTitle}:\n${cleaned}\n${DESCRIPTION_END_TAG}`

    // Update the pull request description
    await this.octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: pullRequestNumber,
      body: newDescription
    })
  }

  /**
   * Creates a review comment on a specific file in a pull request.
   *
   * @param filename - The path of the file to comment on
   * @param review - The review comment object containing comment text and line information
   * @returns A Promise that resolves when the comment is successfully created
   */
  async createReviewComment(filename: string, review: ReviewComment) {
    // Define base request and conditional parameters separately
    // Set the common parameters needed for all review comments
    const baseRequest = {
      owner: this.prContext.owner,
      repo: this.prContext.repo,
      pull_number: this.prContext.pullRequestNumber,
      commit_id: this.prContext.headCommitId, // The commit SHA to place the comment on
      path: filename, // The file path where the comment should appear
      body: `${REVIEW_START_TAG}\n\n${review.comment}\n\n${REVIEW_END_TAG}` // The actual comment content
    }

    // Set line parameters appropriately
    // If start and end lines are the same, create a single-line comment
    // Otherwise, create a multi-line comment spanning from start_line to line
    const requestParams =
      review.startLine === review.endLine
        ? { ...baseRequest, line: review.endLine }
        : {
            ...baseRequest,
            start_line: review.startLine,
            line: review.endLine
          }

    // Send the API request to create the review comment and get the result
    const reviewCommentResult =
      await this.octokit.rest.pulls.createReviewComment(requestParams)
    if (reviewCommentResult.status !== 201) {
      // Comment was successfully created with 201 Created status
      // debug(`Comment created: $reviewCommentResult.data.html_url`);
      warning(
        `Failed to create review comment\nrequest: ${JSON.stringify(requestParams, null, 2)}\nstatus: ${reviewCommentResult.status}`
      )
    }
  }

  /**
   * Extracts the original description by removing any content that was
   * previously added between the defined tags.
   *
   * @param description - The full description text of the pull request
   * @returns The description text without any auto-generated content
   */
  getDescription(description: string) {
    return this.removeContentWithinTags(
      description,
      DESCRIPTION_START_TAG,
      DESCRIPTION_END_TAG
    )
  }

  /**
   * Removes any content found between the specified start and end tags.
   *
   * @param content - The string to process
   * @param startTag - The opening tag marking the beginning of content to remove
   * @param endTag - The closing tag marking the end of content to remove
   * @returns The content string with the tagged section removed
   */
  removeContentWithinTags(content: string, startTag: string, endTag: string) {
    const start = content.indexOf(startTag)
    const end = content.lastIndexOf(endTag)
    if (start >= 0 && end >= 0) {
      return content.slice(0, start) + content.slice(end + endTag.length)
    }
    return content
  }

  /**
   * Adds a commit ID to the list of reviewed commits in a comment.
   * If the commit ID tags don't exist in the comment, they will be added.
   *
   * @param comment - The comment text to add the commit ID to
   * @param commitId - The commit ID (SHA) to add to the comment
   * @returns The updated comment text with the commit ID included
   */
  addReviewedCommitId(comment: string, commitId: string): string {
    const start = comment.indexOf(COMMIT_ID_START_TAG)
    const end = comment.indexOf(COMMIT_ID_END_TAG)
    if (start === -1 || end === -1) {
      return `${comment}\n${COMMIT_ID_START_TAG}\n<!-- ${commitId} -->\n${COMMIT_ID_END_TAG}`
    }
    const ids = comment.substring(start + COMMIT_ID_START_TAG.length, end)
    return `${comment.substring(
      0,
      start + COMMIT_ID_START_TAG.length
    )}${ids}<!-- ${commitId} -->\n${comment.substring(end)}`
  }

  /**
   * Posts a summary of the pull request as a comment.
   * Includes the commit summary and a collapsible list of changed files.
   *
   * @param changeFiles - Array of files changed in the pull request
   * @returns A Promise that resolves when the summary comment is created or updated
   */
  async postPullRequestSummary(changeFiles: ChangeFile[]) {
    const mode = this.prContext.summaryCommentId ? "update" : "create"

    debug(
      `summary comment in ${mode} mode. comment id: ${this.prContext.summaryCommentId}.`
    )

    const commitMsg = this.addReviewedCommitId(
      this.prContext.getCommitSummary(),
      this.prContext.headCommitId
    )

    const files = changeFiles
      .map((file) => {
        return `- ${file.filename}`
      })
      .join("\n")

    const fileCount = changeFiles.length

    const reviewFiles = `
<details>
<summary>Review Files (${fileCount})</summary>

${files}

</details>`

    const message = `
Pull Request Summary

${commitMsg}
${reviewFiles}
    `

    await this.comment({
      message: message,
      tag: SUMMARIZE_TAG,
      mode: mode,
      commentId: this.prContext.summaryCommentId
    })
  }
}
