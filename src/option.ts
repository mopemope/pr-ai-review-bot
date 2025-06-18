import { debug, info, warning } from "@actions/core"
import { minimatch } from "minimatch"
import * as path from "path"

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
  baseURL: string | undefined
  fileTypePrompts: Map<string, string>

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
    ignoreKeywords: string[],
    baseURL: string | undefined,
    fileTypePrompts: string
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
    if (baseURL && baseURL.length > 0) {
      this.baseURL = baseURL
    }
    this.fileTypePrompts = this.parseFileTypePrompts(fileTypePrompts)
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

  /**
   * Determines the file type based on the filename and extension.
   * This is used to apply file-type specific prompts and review policies.
   *
   * @param filename - The name of the file to analyze
   * @returns The file type identifier (e.g., 'javascript', 'python', 'generic')
   */
  getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase()
    const basename = path.basename(filename).toLowerCase()

    // Special filename patterns
    if (basename === "dockerfile" || basename.startsWith("dockerfile."))
      return "docker"
    if (basename === "makefile") return "makefile"
    if (basename.endsWith(".yml") || basename.endsWith(".yaml")) return "yaml"
    if (basename === "package.json" || basename === "package-lock.json")
      return "json"
    if (basename === "tsconfig.json" || basename.includes("tsconfig"))
      return "json"
    if (basename === "cargo.toml" || basename === "cargo.lock") return "toml"
    if (basename === "go.mod" || basename === "go.sum") return "go"
    if (basename === "requirements.txt" || basename === "pyproject.toml")
      return "python"
    if (basename === ".gitignore" || basename === ".gitattributes")
      return "gitignore"
    if (basename === ".env" || basename.startsWith(".env.")) return "env"

    // Extension-based mapping
    const extensionMapping: Record<string, string> = {
      // JavaScript/TypeScript
      ".js": "javascript",
      ".jsx": "javascript",
      ".mjs": "javascript",
      ".cjs": "javascript",
      ".ts": "typescript",
      ".tsx": "typescript",
      ".d.ts": "typescript",

      // Python
      ".py": "python",
      ".pyx": "python",
      ".pyi": "python",
      ".pyw": "python",

      // Java/JVM languages
      ".java": "java",
      ".kt": "kotlin",
      ".kts": "kotlin",
      ".scala": "scala",
      ".groovy": "groovy",

      // C/C++
      ".c": "c",
      ".h": "c",
      ".cpp": "cpp",
      ".cxx": "cpp",
      ".cc": "cpp",
      ".hpp": "cpp",
      ".hxx": "cpp",
      ".hh": "cpp",

      // Other compiled languages
      ".go": "go",
      ".rs": "rust",
      ".swift": "swift",
      ".cs": "csharp",
      ".fs": "fsharp",
      ".vb": "vb",

      // Scripting languages
      ".php": "php",
      ".rb": "ruby",
      ".pl": "perl",
      ".lua": "lua",
      ".r": "r",

      // Shell scripts
      ".sh": "shell",
      ".bash": "shell",
      ".zsh": "shell",
      ".fish": "shell",
      ".ps1": "powershell",

      // Web technologies
      ".html": "html",
      ".htm": "html",
      ".css": "css",
      ".scss": "scss",
      ".sass": "sass",
      ".less": "less",

      // Data formats
      ".json": "json",
      ".xml": "xml",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".toml": "toml",
      ".ini": "ini",
      ".cfg": "ini",
      ".conf": "config",

      // Database
      ".sql": "sql",

      // Documentation
      ".md": "markdown",
      ".markdown": "markdown",
      ".rst": "rst",
      ".tex": "latex",

      // Configuration
      ".dockerfile": "docker"
    }

    const fileType = extensionMapping[ext]
    if (fileType) {
      debug(`File type detected: ${filename} -> ${fileType}`)
      return fileType
    }

    debug(`File type not recognized: ${filename} -> generic`)
    return "generic"
  }

  /**
   * Retrieves the file type specific prompt for a given filename.
   * This prompt will be appended to the system prompt for enhanced review quality.
   *
   * @param filename - The name of the file to get the prompt for
   * @returns The file type specific prompt, or empty string if none exists
   */
  getFileTypePrompt(filename: string): string {
    const fileType = this.getFileType(filename)
    const prompt = this.fileTypePrompts.get(fileType) || ""
    if (prompt) {
      debug(
        `File type prompt found for ${filename} (${fileType}): ${prompt.substring(0, 100)}...`
      )
    }
    return prompt
  }

  /**
   * Parses the file type prompts configuration from YAML-like format.
   * Supports simple YAML structure with multiline values using pipe (|) syntax.
   *
   * @param input - The YAML-like string containing file type prompts
   * @returns A Map containing file type to prompt mappings
   */
  private parseFileTypePrompts(input: string): Map<string, string> {
    const result = new Map<string, string>()

    if (!input || !input.trim()) {
      debug("No file type prompts provided")
      return result
    }

    try {
      const lines = input.split("\n")
      let currentKey = ""
      let currentValue = ""
      let inMultilineValue = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        // Skip empty lines and comments (but not inside multiline values)
        if (!trimmed || (trimmed.startsWith("#") && !inMultilineValue)) {
          continue
        }

        // Check for new key definition (key: or key: |)
        const keyMatch = line.match(
          /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(\|?)(.*)$/
        )
        if (keyMatch && !line.startsWith(" ")) {
          // Save previous key-value pair if exists
          if (currentKey && currentValue.trim()) {
            result.set(currentKey, currentValue.trim())
            debug(`Parsed file type prompt: ${currentKey}`)
          }

          currentKey = keyMatch[1].trim()
          const isMultiline = keyMatch[2] === "|"
          const inlineValue = keyMatch[3].trim()

          if (isMultiline) {
            // Start multiline value
            inMultilineValue = true
            currentValue = inlineValue ? inlineValue + "\n" : ""
          } else {
            // Single line value
            inMultilineValue = false
            currentValue = inlineValue
          }
        } else if (
          currentKey &&
          (line.startsWith("  ") || line.startsWith("\t"))
        ) {
          // Continuation of multiline value (indented)
          if (inMultilineValue) {
            // Remove leading indentation (2 spaces or 1 tab)
            const unindented = line.startsWith("  ")
              ? line.substring(2)
              : line.substring(1)
            currentValue += unindented + "\n"
          }
        } else if (currentKey && inMultilineValue && trimmed) {
          // Non-indented line in multiline context - end of current value
          if (currentValue.trim()) {
            result.set(currentKey, currentValue.trim())
            debug(`Parsed file type prompt: ${currentKey}`)
          }
          currentKey = ""
          currentValue = ""
          inMultilineValue = false

          // Process this line as a potential new key
          const newKeyMatch = line.match(
            /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(\|?)(.*)$/
          )
          if (newKeyMatch) {
            currentKey = newKeyMatch[1].trim()
            const isMultiline = newKeyMatch[2] === "|"
            const inlineValue = newKeyMatch[3].trim()

            if (isMultiline) {
              inMultilineValue = true
              currentValue = inlineValue ? inlineValue + "\n" : ""
            } else {
              inMultilineValue = false
              currentValue = inlineValue
            }
          }
        }
      }

      // Save the last key-value pair
      if (currentKey && currentValue.trim()) {
        result.set(currentKey, currentValue.trim())
        debug(`Parsed file type prompt: ${currentKey}`)
      }

      info(`Loaded ${result.size} file type prompts`)
    } catch (error) {
      warning(`Failed to parse file_type_prompts: ${error}`)
    }

    return result
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
