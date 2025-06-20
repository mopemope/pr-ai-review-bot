import {
  getBooleanInput,
  getInput,
  getMultilineInput,
  info,
  setFailed,
  warning
} from "@actions/core"
import { context, getOctokit } from "@actions/github"
import debug from "debug"
import { Commenter, SUMMARIZE_TAG } from "./commenter.js"
import { PullRequestContext } from "./context.js"
import { Options } from "./option.js"
import { parsePatch } from "./patchParser.js"
import { Prompts } from "./prompts.js"
import { Reviewer } from "./reviewer.js"
import type { ChangeFile, FileDiff } from "./types.js"

/**
 * Retrieves all configuration options from GitHub Actions inputs.
 * Reads boolean flags, text inputs, and multiline inputs to configure the reviewer.
 *
 * @returns Configured Options instance with all action parameters
 */
const getOptions = () => {
  return new Options(
    getBooleanInput("debug"),
    getBooleanInput("disable_review"),
    getBooleanInput("disable_release_notes"),
    getMultilineInput("path_filters"),
    getInput("system_prompt"),
    getMultilineInput("summary_model"),
    getMultilineInput("model"),
    getInput("retries"),
    getInput("timeout_ms"),
    getInput("language"),
    getInput("summarize_release_notes"),
    getInput("release_notes_title"),
    getBooleanInput("use_file_content"),
    getInput("custom_review_policy"),
    getInput("comment_greeting"),
    getMultilineInput("ignore_keywords"),
    getInput("base_url") || undefined,
    getInput("file_type_prompts")
  )
}

const token = process.env.GITHUB_TOKEN || ""

/**
 * Gets the PR context information from GitHub action context.
 * Extracts repository owner, PR title, repository name, PR body, PR number,
 * and commit SHA from the GitHub context.
 *
 * @returns Pull request context object with all required PR metadata
 */
const getPrContext = (): PullRequestContext => {
  const repo = context.repo
  const pull_request = context.payload.pull_request

  return new PullRequestContext(
    repo.owner,
    pull_request?.title,
    repo.repo,
    pull_request?.body || "",
    pull_request?.number || 0,
    pull_request?.base?.sha,
    pull_request?.head?.sha
  )
}

/**
 * Fetches the content of a file from GitHub repository.
 *
 * @param octokit - GitHub API client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - File path
 * @param ref - Git reference (branch, tag, or commit SHA)
 * @returns The content of the file as a string or undefined if not found
 */
const getFileContent = async (
  octokit: ReturnType<typeof getOctokit>,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | undefined> => {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref
    })

    if ("content" in response.data && response.data.content) {
      // Content is base64 encoded
      return Buffer.from(response.data.content, "base64").toString()
    }
    return undefined
  } catch (error) {
    warning(`Failed to fetch content for ${path} ${error}`)
    return undefined
  }
}

/**
 * Fetches and processes the changed files in a pull request.
 * Retrieves the diff between base and head commits, parses the patch information,
 * and constructs FileDiff objects for each changed section of code.
 *
 * @param prContext - Pull request context containing repository and commit information
 * @param options - Configuration options for the reviewer
 * @param octokit - GitHub API client instance
 * @returns Array of ChangeFile objects with parsed diff information
 * @throws Error if the commit information cannot be found
 */
const getChangedFiles = async ({
  prContext,
  options,
  octokit,
  baseCommitId
}: {
  prContext: PullRequestContext
  options: Options
  octokit: ReturnType<typeof getOctokit>
  baseCommitId: string
}): Promise<ChangeFile[]> => {
  debug(`getChangedFiles: ${baseCommitId} ${prContext.headCommitId}`)

  // Compare commits to find changes between the last reviewed commit and current head
  const targetBranchDiff = await octokit.rest.repos.compareCommits({
    owner: prContext.owner,
    repo: prContext.repo,
    base: baseCommitId,
    head: prContext.headCommitId
  })

  const changes: ChangeFile[] = []

  // Return empty array if no files were changed
  if (!targetBranchDiff.data.files) {
    return changes
  }

  for (const file of targetBranchDiff.data.files) {
    // Skip files without patch information (binary files or files with no changes)
    if (!file.patch || file.patch === "") {
      continue
    }
    // Skip files that don't match the configured path filters
    if (!options.checkPath(file.filename)) {
      continue
    }

    const changeFile: ChangeFile = {
      filename: file.filename,
      sha: file.sha,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      url: file.blob_url,
      patch: file.patch,
      summary: "",
      content: "",
      diff: []
    }

    if (options.useFileContent) {
      changeFile.content = await getFileContent(
        octokit,
        prContext.owner,
        prContext.repo,
        file.filename,
        file.sha
      )
      //debug(
      //  `Fetched content for ${file.filename} from commit ${pull_request.head.sha}\n ${changeFile.content}\n`
      //)
    }

    debug(
      `getChangedFiles: ${file.filename} ${file.status} ${file.changes} ${file.patch}`
    )

    const results = parsePatch({
      filename: file.filename,
      patch: file.patch
    })

    let index: number = 0
    for (const result of results) {
      index++
      const diff: FileDiff = {
        filename: file.filename,
        index,
        from: result.from,
        to: result.to
      }
      changeFile.diff.push(diff)
    }
    changes.push(changeFile)
  }

  return changes
}

/**
 * The main function for the action.
 * This function orchestrates the entire PR review process:
 * 1. Gets the options from inputs
 * 2. Creates prompt templates
 * 3. Retrieves the PR context
 * 4. Initializes the GitHub client
 * 5. Creates a reviewer instance
 * 6. Fetches changed files in the PR
 * 7. Generates a summary of changes if enabled
 * 8. Reviews code changes and posts comments if review is not disabled
 * 9. Posts a summary of the PR to the pull request
 *
 * @returns {Promise<void>} Resolves when the action is complete
 * @throws {Error} If any part of the process fails
 */
export async function run(): Promise<void> {
  try {
    // Load configuration options from action inputs
    const options = getOptions()

    // Initialize prompt templates with configured options
    const prompts = new Prompts(options)

    // replace system prompt with the one from options
    const systemPrompt = prompts.renderTemplate(options.systemPrompt, {
      language: options.language
    })
    // Update the system prompt in options
    options.systemPrompt = systemPrompt

    // Get pull request context information from GitHub context
    const prContext = getPrContext()

    if (options.includeIgnoreKeywords(prContext.description)) {
      // Skip the review if ignore keywords are found in the PR description
      info("Ignore keywords found in PR description. Skipping review.")
      return
    }
    const pull_request = context.payload.pull_request
    if (!pull_request?.base?.sha) {
      info("base commit id not found")
      return
    }

    // Create authenticated GitHub API client
    const octokit = getOctokit(token)

    // Initialize commenter for posting review comments
    const commenter = new Commenter(options, octokit, prContext)
    const existingSummarizeComment = await commenter.findComment(
      SUMMARIZE_TAG,
      prContext.pullRequestNumber
    )

    if (existingSummarizeComment) {
      // set summary comment id
      prContext.summaryCommentId = existingSummarizeComment.id
      const id = commenter.getReviewedCommitIds(existingSummarizeComment.body)
      // info(`Reviewed commit ids: ${id}`)
      if (id.length > 0) {
        prContext.lastReviewCommitId = id[id.length - 1]
      }
    }

    // Create reviewer instance with GitHub client and options
    const reviewer = new Reviewer(commenter, options)

    const allChanges = await getChangedFiles({
      prContext,
      options,
      octokit,
      baseCommitId: prContext.baseCommitId
    })
    // Check if there are any changes in the PR
    // Fetch files changed in the pull request with diff information
    const changes = await getChangedFiles({
      prContext,
      options,
      octokit,
      baseCommitId: prContext.lastReviewCommitId
    })

    const reviews = []
    if (changes.length > 0) {
      if (!options.disableReleaseNotes && !prContext.summaryCommentId) {
        info("Generating a new summary comment.")
        // Generate and post a summary of the PR changes
        const summary = await reviewer.summarizeChanges({
          prContext,
          prompts,
          changes: allChanges
        })

        debug(`Summary changeset: ${summary}`)

        if (!options.localAction) {
          // Update the PR description with the generated summary
          await commenter.updateDescription(summary)
          info(`Updated PR description with summary: ${summary}`)
        }
      }

      if (!options.disableReview) {
        // Review code changes and post feedback comments
        const res = await reviewer.reviewChanges({
          prContext,
          prompts,
          changes
        })
        reviews.push(...res)
      }
    } else {
      info("No changes found in the PR. Skipping review.")
    }

    await commenter.postPullRequestSummary(allChanges, reviews)
    info("Posted pull request summary")
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      setFailed(error.message)
    }
  }
}
