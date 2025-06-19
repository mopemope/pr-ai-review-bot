import { debug, info, warning } from "@actions/core"
import {
  type ChatBot,
  type Message,
  createChatBotFromModel
} from "./chatbot/index.js"
import type { Commenter } from "./commenter.js"
import type { PullRequestContext } from "./context.js"
import type { Options } from "./option.js"
import { PatternDetector } from "./patternDetector.js"
import type { Prompts } from "./prompts.js"
import type { ChangeFile, FileDiff } from "./types.js"

export type ReviewComment = {
  filename: string
  startLine: number
  endLine: number
  comment: string
  isLGTM: boolean
}

// Define a structure for a review task
type ReviewTask = {
  change: ChangeFile
  diff: FileDiff
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
   * Pattern detector for analyzing security and performance issues.
   * @private
   */
  private patternDetector: PatternDetector

  /**
   * Creates a new Reviewer instance.
   * @param octokit - GitHub API client instance
   * @param commenter - Commenter instance for posting comments
   * @param options - Configuration options for the reviewer and chatbot
   */
  constructor(commenter: Commenter, options: Options) {
    this.commenter = commenter
    this.options = options
    this.patternDetector = new PatternDetector()

    this.summaryBot = this.options.summaryModel.map((summaryModel) =>
      createChatBotFromModel(summaryModel, this.options)
    )

    this.reviewBot = this.options.model.map((model) =>
      createChatBotFromModel(model, this.options)
    )

    const summaryModel = this.getSummaryBot()?.getFullModelName() || "Unknown"
    const reviewModel = this.getReviewBot()?.getFullModelName() || "Unknown"
    info(`use summary model: ${summaryModel}`)
    info(`use review model: ${reviewModel}`)
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
        info("No more summary bot available")
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
        info("No more review bot available")
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
      // Detect patterns in the changed file
      const patternResult = this.patternDetector.detectPatterns(change)
      change.detectedPatterns = patternResult.patterns

      debug(
        `Pattern detection for ${change.filename}: ${patternResult.patterns.length} patterns, risk: ${patternResult.riskLevel}`
      )

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
   * Process a single review task (one diff in one file)
   *
   * @param prContext - The PR context
   * @param prompts - The prompts to use
   * @param task - The review task containing change and diff information
   * @returns An array of review comments
   */
  private async processReviewTask(
    prContext: PullRequestContext,
    prompts: Prompts,
    task: ReviewTask
  ): Promise<ReviewComment[]> {
    const { change, diff } = task
    const filename = change.filename

    info(`Start review: ${diff.filename}#${diff.index}`)

    // Detect patterns if not already done
    if (!change.detectedPatterns) {
      const patternResult = this.patternDetector.detectPatterns(change)
      change.detectedPatterns = patternResult.patterns

      debug(
        `Pattern detection for ${change.filename}: ${patternResult.patterns.length} patterns, risk: ${patternResult.riskLevel}`
      )
    }

    // Create a prompt specific to this file's diff
    const reviewPrompt = prompts.renderReviewPrompt(prContext, change, diff)

    // Generate the review comment
    let reviewComment: string
    try {
      reviewComment = await this.createReview(prContext, reviewPrompt)
      reviewComment = reviewComment.trim() // Fix: assign the result back to the variable
    } catch (error) {
      warning(
        `Failed to generate review comment for ${diff.filename}#${diff.index}: ${error}`
      )
      return []
    }

    // Parse the review comment
    const reviews = parseReviewComment(filename, reviewComment)

    // Process and post each review comment
    for (const review of reviews) {
      info(
        `Review comment: ${diff.filename}: ${review.startLine}-${review.endLine}\n${review.comment}`
      )

      // Skip LGTM comments
      if (review.isLGTM) {
        continue
      }

      // Post comment if not running locally
      if (!this.options.localAction) {
        try {
          await this.commenter.createReviewComment(change.filename, review)
        } catch (error) {
          warning(
            `Failed to post review comment for ${diff.filename}#${diff.index}: ${error}`
          )
        }
      }
    }

    info(`End review: ${diff.filename}#${diff.index}`)
    return reviews
  }

  /**
   * Reviews code changes in a pull request and posts review comments.
   * Changes are processed in parallel batches for improved performance.
   *
   * @param prContext - Context information about the pull request
   * @param prompts - Prompt templates for generating reviews
   * @param changes - List of files changed in the pull request
   * @param batchSize - Number of changes to process in parallel (default: 3)
   * @returns A promise that resolves when all reviews are completed and comments are posted
   */
  async reviewChanges({
    prContext,
    prompts,
    changes,
    batchSize = 3
  }: {
    prContext: PullRequestContext
    prompts: Prompts
    changes: ChangeFile[]
    batchSize?: number
  }): Promise<ReviewComment[]> {
    // Create a list of all review tasks (file + diff combinations)
    const allTasks: ReviewTask[] = []
    for (const change of changes) {
      for (const diff of change.diff) {
        allTasks.push({ change, diff })
      }
    }

    const allResults: ReviewComment[] = []

    // Process tasks in batches
    for (let i = 0; i < allTasks.length; i += batchSize) {
      // Get the current batch of tasks
      const currentBatch = allTasks.slice(i, i + batchSize)
      info(
        `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allTasks.length / batchSize)} (${currentBatch.length} tasks)`
      )

      // Process all tasks in current batch in parallel
      const batchPromises = currentBatch.map((task) =>
        this.processReviewTask(prContext, prompts, task)
      )

      // Wait for all tasks in this batch to complete
      const batchResults = await Promise.all(batchPromises)

      // Collect all results from this batch
      for (const comments of batchResults) {
        allResults.push(...comments)
      }
    }

    return allResults
  }
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
export const parseReviewComment = (
  filename: string,
  reviewComment: string
): ReviewComment[] => {
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
          filename,
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
