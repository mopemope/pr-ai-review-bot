/**
 * Class that holds context information for a pull request
 * Stores pull request related data and handles chatbot creation
 */
export class PullRequestContext {
  /** Repository owner name */
  public owner: string
  /** Pull request title */
  public title: string
  /** Pull request description (optional) */
  public description: string
  /** Summary of the pull request (optional) */
  public summary: string
  /** Repository name */
  public repo: string
  /** Pull request number */
  public pullRequestNumber: number

  /** Base commit ID from which PR changes are compared */
  public baseCommitId: string
  /** Last commit ID that was reviewed */
  public lastReviewCommitId: string
  /** Head commit ID representing the latest commit in the PR */
  public headCommitId: string
  /** Array of file summaries in markdown format */
  public fileSummaries: string[]

  public summaryCommentId?: number

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
  constructor(
    owner: string,
    title: string,
    repo: string,
    description: string,
    pullRequestNumber: number,
    baseCommitId: string,
    headCommitId: string
  ) {
    this.owner = owner
    this.title = title
    this.repo = repo
    this.description = description
    this.pullRequestNumber = pullRequestNumber
    this.baseCommitId = baseCommitId
    this.headCommitId = headCommitId

    this.lastReviewCommitId = baseCommitId
    this.summary = ""
    this.fileSummaries = []
  }

  /**
   * Appends a file change summary to the fileSummaries array
   * Each summary is formatted as markdown with the file name as a heading
   *
   * @param file File name or path to be included in the heading
   * @param summary Summary of changes for the file in markdown format
   */
  appendChangeSummary(file: string, summary: string) {
    this.fileSummaries.push(`### ${file}\n\n${summary}`)
  }

  /**
   * Returns a combined string of all file summaries
   * Joins all file summaries with newlines to create a complete markdown document
   *
   * @returns Markdown formatted string containing all file change summaries
   */
  getChangeSummary(): string {
    return `${this.fileSummaries.join("\n")}`
  }

  /**
   * Generates a markdown formatted summary of commits in the pull request
   * Creates a collapsible details section containing commit range information
   *
   * @returns Markdown formatted string with commit summary information
   */
  getCommitSummary(): string {
    return `
<details>
<summary>Commits</summary>
Files that changed from the base of the PR and between ${this.baseCommitId} and ${this.headCommitId} commits.
</details>
    `
  }
}
