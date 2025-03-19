import { debug, info, warning } from "@actions/core"
import {
  type ChatBot,
  createChatBotFromModel,
  Message
} from "./chatbot/index.js"
import type { Commenter } from "./commenter.js"
import type { PullRequestContext } from "./context.js"
import type { Options } from "./option.js"
import type { Prompts } from "./prompts.js"
import type { ChangeFile } from "./types.js"

export type ReviewComment = {
  startLine: number
  endLine: number
  comment: string
  isLGTM: boolean
}

/**
 * Reviewer class responsible for performing code reviews using a chatbot.
 * It initializes with configuration options and creates the appropriate chatbot instance.
 */
export class Reviewer {
  /**
   * Configuration options for the reviewer.
   * @private
   */
  private options: Options

  /**
   * Commenter instance used to post review comments to GitHub.
   * @private
   */
  private commenter: Commenter

  /**
   * ChatBot instance used for generating summaries of changes.
   * @private
   */
  private summaryBot: ChatBot[]

  /**
   * The chatbot instance used for generating review comments.
   * @private
   */
  private reviewBot: ChatBot[]

  /**
   * Creates a new Reviewer instance.
   * @param octokit - GitHub API client instance
   * @param commenter - Commenter instance for posting comments
   * @param options - Configuration options for the reviewer and chatbot
   */
  constructor(commenter: Commenter, options: Options) {
    this.commenter = commenter
    this.options = options

    this.summaryBot = this.options.summaryModel.map((summaryModel) =>
      createChatBotFromModel(summaryModel, this.options)
    )

    this.reviewBot = this.options.model.map((model) =>
      createChatBotFromModel(model, this.options)
    )
  }

  getSummaryBot(): ChatBot | undefined {
    if (this.summaryBot.length > 0) {
      return this.summaryBot[0]
    }
    return undefined
  }

  fallbackSummaryBot(): void {
    if (this.summaryBot.length > 0) {
      const old = this.summaryBot.shift()
      const next = this.getSummaryBot()
      if (next) {
        info(
          `Fallback summary bot from ${old?.getFullModelName()} to ${next.getFullModelName()}`
        )
      } else {
        info(`No more summary bot available`)
      }
    }
  }

  getReviewBot(): ChatBot | undefined {
    if (this.reviewBot.length > 0) {
      return this.reviewBot[0]
    }
    return undefined
  }

  fallbackReviewBot(): void {
    if (this.reviewBot.length > 0) {
      const old = this.reviewBot.shift()
      const next = this.getReviewBot()
      if (next) {
        info(
          `Fallback review bot from ${old?.getFullModelName()} to ${next.getFullModelName()}`
        )
      } else {
        info(`No more review bot available`)
      }
    }
  }

  async createSummary(
    prContext: PullRequestContext,
    prompts: Message[]
  ): Promise<string> {
    const summaryBot = this.getSummaryBot()
    if (!summaryBot) {
      throw new Error("No summary bot available")
    }
    try {
      const summary = await summaryBot.create(prContext, prompts)
      return summary
    } catch (error) {
      warning(`Failed to create summary: ${error}`)
      // fallback to the next summary bot
      this.fallbackSummaryBot()
      return this.createSummary(prContext, prompts)
    }
  }

  async createReview(
    prContext: PullRequestContext,
    prompts: Message[]
  ): Promise<string> {
    const reviewBot = this.getReviewBot()
    if (!reviewBot) {
      throw new Error("No summary bot available")
    }
    try {
      const review = await reviewBot.create(prContext, prompts)
      return review
    } catch (error) {
      warning(`Failed to create review: ${error}`)
      // fallback to the next review bot
      this.fallbackReviewBot()
      return this.createReview(prContext, prompts)
    }
  }

  /**
   * Generates summaries for each file change in a pull request and creates an overall release note.
   * It processes all files sequentially, generating individual file summaries before creating a consolidated release note.
   *
   * @param prContext - Context information about the pull request
   * @param prompts - Prompt templates for generating summaries
   * @param changes - List of files changed in the pull request
   * @returns A promise that resolves to a string containing the generated release note summary
   */
  async summarizeChanges({
    prContext,
    prompts,
    changes
  }: {
    prContext: PullRequestContext
    prompts: Prompts
    changes: ChangeFile[]
  }): Promise<string> {
    // Process each file change and generate individual summaries
    for (const change of changes) {
      // Create a prompt specific to this file's changes
      const prompt = prompts.renderSummarizeFileDiff(prContext, change)
      // Generate summary for this specific file change using the chatbot
      const summary = await this.createSummary(prContext, prompt)

      // Set the summary in the change object
      change.summary = summary
      // Log the summary for debugging purposes
      debug(`Summary: ${change.filename} \n ${summary}\n`)
      // Store the summary in the PR context for later use
      prContext.appendChangeSummary(change.filename, summary)
    }

    // Retrieve the compiled summary of all file changes
    const message = prContext.getChangeSummary()
    // Generate a comprehensive release note based on all file summaries
    const prompt = prompts.renderSummarizeReleaseNote(message)
    debug(`Release Note prompt: ${JSON.stringify(prompt, null, 2)}`)

    return await this.createSummary(prContext, prompt)
  }

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
  async reviewChanges({
    prContext,
    prompts,
    changes
  }: {
    prContext: PullRequestContext
    prompts: Prompts
    changes: ChangeFile[]
  }) {
    for (const change of changes) {
      for (const diff of change.diff) {
        // Create a prompt specific to this file's diff
        const reviewPrompt = prompts.renderReviewPrompt(prContext, change, diff)

        // Debug the review prompt
        // debug(`Review prompt: ${JSON.stringify(reviewPrompt, null, 2)}`)
        info(`Start review: ${diff.filename}#${diff.index}`)

        let reviewComment: string | undefined = undefined
        try {
          reviewComment = await this.createReview(prContext, reviewPrompt)
          // Trim leading/trailing whitespace from the review comment
          reviewComment.trim()
        } catch (error) {
          // Handle error in review comment generation
          warning(
            `Failed to generate review comment for ${diff.filename}#${diff.index}: ${error}`
          )
          continue
        }
        debug(`Review comment: ${diff.filename} : ${reviewComment}`)
        const reviews = parseReviewComment(reviewComment)

        for (const review of reviews) {
          if (review.isLGTM) {
            continue
          }
          if (!this.options.localAction) {
            try {
              await this.commenter.createReviewComment(
                change.filename,
                change.sha,
                review
              )
            } catch (error) {
              warning(
                `Failed to post review comment for ${diff.filename}#${diff.index}: ${error}`
              )
            }
          }
        }
        info(`End review: ${diff.filename}#${diff.index}`)
      }
    }
  }
}

/**
 * Parses the review comment string and extracts structured review data.
 * The function splits the comment by "---" separators and extracts line numbers
 * and comment content for each section. Comments containing "LGTM!" are flagged.
 *
 * @param reviewComment - The raw review comment string to parse
 * @returns Array of ReviewComment objects containing structured review data
 */
export const parseReviewComment = (reviewComment: string): ReviewComment[] => {
  // Return empty array for empty comments
  if (!reviewComment || reviewComment.trim().length === 0) {
    return []
  }

  // Split by separator
  const sections = reviewComment
    .split("---")
    .filter((section) => section.trim().length > 0)
  const result: ReviewComment[] = []

  for (const section of sections) {
    // Extract line numbers and comment content
    const match = section.trim().match(/^(\d+)-(\d+):?\s*([\s\S]+\S)$/)

    if (match) {
      const startLine = Number.parseInt(match[1], 10)
      const endLine = Number.parseInt(match[2], 10)
      const comment = match[3].trim()

      // Check if comment contains LGTM
      const isLGTM = comment.toLowerCase().includes("lgtm!")

      // Only add the review if the line range is valid (startLine <= endLine)
      if (startLine <= endLine) {
        result.push({
          startLine,
          endLine,
          comment,
          isLGTM
        })
      }
    }
  }

  return result
}
