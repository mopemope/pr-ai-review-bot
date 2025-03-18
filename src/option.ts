import { debug, info } from "@actions/core"
import { minimatch } from "minimatch"

export class Options {
  debug: boolean
  disableReview: boolean
  disableReleaseNotes: boolean
  pathFilters: PathFilter
  systemPrompt: string
  summaryModel: string[]
  model: string[]
  retries: number
  timeoutMS: number
  language: string
  summarizeReleaseNotes: string
  releaseNotesTitle: string
  useFileContent: boolean
  localAction: boolean
  reviewPolicy: string
  commentGreeting: string
  ignoreKeywords: string[]

  constructor(
    debug: boolean,
    disableReview: boolean,
    disableReleaseNotes: boolean,
    pathFilters: string[] | null,
    systemPrompt: string,
    summaryModel: string[],
    model: string[],
    retries: string,
    timeoutMS: string,
    language: string,
    summarizeReleaseNotes: string,
    releaseNotesTitle: string,
    useFileContent: boolean,
    reviewPolicy: string,
    commentGreeting: string,
    ignoreKeywords: string[]
  ) {
    this.debug = debug
    this.disableReview = disableReview
    this.disableReleaseNotes = disableReleaseNotes
    this.pathFilters = new PathFilter(pathFilters)
    this.systemPrompt = systemPrompt
    this.summaryModel = summaryModel
    this.model = model
    this.retries = Number.parseInt(retries)
    this.timeoutMS = Number.parseInt(timeoutMS)
    this.language = language
    this.summarizeReleaseNotes = summarizeReleaseNotes
    this.releaseNotesTitle = releaseNotesTitle
    this.useFileContent = useFileContent
    this.localAction = process.env.LOCAL_ACTION === "true"
    this.reviewPolicy = reviewPolicy
    this.commentGreeting = commentGreeting
    this.ignoreKeywords = ignoreKeywords
  }

  /**
   * Prints all configuration options using core.info for debugging purposes.
   * Displays each option value in the GitHub Actions log.
   */
  print(): void {
    info(`debug: ${this.debug}`)
    info(`disable_review: ${this.disableReview}`)
    info(`disable_release_notes: ${this.disableReleaseNotes}`)
    info(`path_filters: ${this.pathFilters?.toString()}`)
    info(`system_prompt: ${this.systemPrompt}`)
    info(`summary_model: ${this.summaryModel}`)
    info(`model: ${this.model}`)
    info(`openai_retries: ${this.retries}`)
    info(`openai_timeout_ms: ${this.timeoutMS}`)
    info(`language: ${this.language}`)
    info(`summarize_release_notes: ${this.summarizeReleaseNotes}`)
    info(`release_notes_title: ${this.releaseNotesTitle}`)
  }

  /**
   * Checks if a file path should be included based on configured path filters.
   * Logs the result of the check for debugging purposes.
   *
   * @param path - The file path to check against filters
   * @returns Boolean indicating whether the path should be included
   */
  checkPath(path: string): boolean {
    const ok = this.pathFilters.check(path)
    debug(`checking path: ${path} => ${ok}`)
    return ok
  }

  /**
   * Checks if any of the configured ignore keywords are present in the description.
   *
   * @param description - The text to check for ignore keywords
   * @returns Boolean indicating whether any ignore keywords were found
   */
  includeIgnoreKeywords(description: string): boolean {
    if (this.ignoreKeywords.length === 0) {
      return false
    }
    for (const keyword of this.ignoreKeywords) {
      if (description.includes(keyword)) {
        return true
      }
    }
    return false
  }
}

export class PathFilter {
  private readonly rules: Array<[string /* rule */, boolean /* exclude */]>

  toString(): string {
    return JSON.stringify(this.rules)
  }

  /**
   * Creates a new PathFilter instance with inclusion and exclusion rules.
   * Rules starting with "!" are treated as exclusion rules.
   *
   * @param rules - Array of glob patterns for path filtering, null for no filtering
   */
  constructor(rules: string[] | null = null) {
    this.rules = []
    if (rules != null) {
      for (const rule of rules) {
        const trimmed = rule?.trim()
        if (trimmed) {
          if (trimmed.startsWith("!")) {
            this.rules.push([trimmed.substring(1).trim(), true])
          } else {
            this.rules.push([trimmed, false])
          }
        }
      }
    }
  }

  /**
   * Checks if a path matches the filter rules.
   * A path is considered valid if:
   * 1. No inclusion rules exist OR the path matches at least one inclusion rule
   * 2. AND the path doesn't match any exclusion rules
   *
   * @param path - The file path to check against the rules
   * @returns Boolean indicating whether the path passes the filter
   */
  check(path: string): boolean {
    if (this.rules.length === 0) {
      return true
    }

    // Track if the path is explicitly included or excluded by any rules
    let included = false
    let excluded = false
    // Track if any inclusion rules exist at all
    let inclusionRuleExists = false

    for (const [rule, exclude] of this.rules) {
      // Check if the path matches the current rule pattern
      if (minimatch(path, rule)) {
        if (exclude) {
          // If it's an exclusion rule and matches, mark as excluded
          excluded = true
        } else {
          // If it's an inclusion rule and matches, mark as included
          included = true
        }
      }
      // Keep track of whether any inclusion rules exist
      if (!exclude) {
        inclusionRuleExists = true
      }
    }

    // Path is valid if:
    // 1. No inclusion rules exist OR the path matches at least one inclusion rule
    // 2. AND the path doesn't match any exclusion rules
    return (!inclusionRuleExists || included) && !excluded
  }
}
