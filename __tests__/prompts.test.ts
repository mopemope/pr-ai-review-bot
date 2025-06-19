// 型のみではなく実際のクラスとしてインポート
import { PullRequestContext } from "../src/context"
import type { Options } from "../src/option"
import { Prompts, renderFileDiffHunk } from "../src/prompts"
import type { ChangeFile, FileDiff } from "../src/types"

// Mock Options interface for testing
interface MockOptions {
  language: string
  useFileContent: boolean
  reviewPolicy?: string
  getFileTypePrompt: (filename: string) => string
}

describe("Prompts", () => {
  let prompts: Prompts
  let mockOptions: MockOptions

  beforeEach(() => {
    mockOptions = {
      language: "ja-JP",
      useFileContent: true,
      reviewPolicy: "Be thorough and detailed",
      getFileTypePrompt: () => ""
    }
    prompts = new Prompts(mockOptions as Options)
  })

  describe("renderTemplate", () => {
    test("Basic placeholder replacement", () => {
      const template = "Hello, $name! You are $age years old."
      const values = { name: "John Smith", age: "30" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Hello, John Smith! You are 30 years old.")
    })

    test("Placeholder replacement with curly braces", () => {
      const template = "Hello, ${name}! You are ${age} years old."
      const values = { name: "John Smith", age: "30" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Hello, John Smith! You are 30 years old.")
    })

    test("Placeholder replacement with both formats", () => {
      const template = "Hello, $name! You are ${age} years old."
      const values = { name: "John Smith", age: "30" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Hello, John Smith! You are 30 years old.")
    })

    test("Adding footer", () => {
      const template = "Test body"
      const values = {}

      const result = prompts.renderTemplate(template, values, true)

      expect(result).toContain("Test body")
      expect(result).toContain("---")
      expect(result).toContain("IMPORTANT")
      expect(result).toContain("ja-JP") // Correctly set language from mockOptions
    })

    test("Conditional block - when true", () => {
      const template = `Hello
$if(hasName){
$name
}$else{
Anonymous User
}!`
      const values = { hasName: "true", name: "John Smith" }

      // Test that conditional blocks render correctly when condition is true
      const result = prompts.renderTemplate(template, values)

      expect(result).toBe(
        `Hello

John Smith
!`
      )
    })

    test("Conditional block - when false", () => {
      const template = `
Hello
$if(hasName){
$name
}$else{
Anonymous User
}!`
      // Empty string value for hasName should evaluate to false
      const values = { hasName: "", name: "John Smith" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe(`
Hello

Anonymous User
!`)
    })

    test("Equality conditional block - when true", () => {
      const template =
        '$if(status == "success"){Process succeeded}$else{Process failed}'
      // Test equality operator in conditional statement
      const values = { status: "success" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Process succeeded")
    })

    test("Equality conditional block - when false", () => {
      const template =
        '$if(status == "success"){Process succeeded}$else{Process failed}'
      const values = { status: "error" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Process failed")
    })

    test("Keeps original text when condition evaluation fails", () => {
      const template = "$if(invalid condition){Text}"
      const values = {}

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("$if(invalid condition){Text}")
    })

    test("Template with undefined placeholders", () => {
      const template = "Hello, $name! $undefined will not be replaced."
      const values = { name: "John Smith" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Hello, John Smith! $undefined will not be replaced.")
    })
  })

  describe("renderSummarizeReleaseNote", () => {
    test("Should generate release note prompt with change summary", () => {
      // Test data
      const changeSummary = "* Added new feature\n* Fixed bug"

      // Call the method
      const result = prompts.renderSummarizeReleaseNote(changeSummary)

      // Assertions
      expect(result).toHaveLength(1)
      expect(result[0].role).toBe("user")
      expect(result[0].cache).toBe(true)
      expect(result[0].text).toContain(
        "Here is the summary of changes you have generated for files:"
      )
      expect(result[0].text).toContain("* Added new feature\n* Fixed bug")
      expect(result[0].text).toContain(
        "Generate concise and structured release notes"
      )
      expect(result[0].text).toContain(
        '"New Feature", "Bug Fix", "Documentation", "Refactor", "Style", "Test", "Chore", or "Revert"'
      )
      expect(result[0].text).toContain("- [Category]: [Change description]")
      expect(result[0].text).toContain("We will communicate in ja-JP")
    })
  })

  describe("renderSummarizeFileDiff", () => {
    test("Should generate file diff summary prompt", () => {
      // Mock PR context with correct property name
      const mockContext = new PullRequestContext(
        "owner",
        "Add new feature",
        "repo",
        "This PR adds a new feature to the system",
        1,
        "base-commit-id",
        "head-commit-id"
      )

      // Mock file change with all required properties
      const mockChangeFile: ChangeFile = {
        filename: "src/example.ts",
        content: "export function example() { return true; }",
        patch: "@ -0,0 +1 @@\n+export function example() { return true; }",
        summary: "",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "https://github.com/owner/repo/blob/sha/src/example.ts",
        diff: [] // empty diff array
      }

      // Call the method
      const result = prompts.renderSummarizeFileDiff(
        mockContext,
        mockChangeFile
      )

      // Assertions
      expect(result).toHaveLength(2)

      // First message (prefix)
      expect(result[0].role).toBe("user")
      expect(result[0].cache).toBe(true)
      expect(result[0].text).toContain("## GitHub PR Title")
      expect(result[0].text).toContain("`Add new feature`")
      expect(result[0].text).toContain("## Description")
      expect(result[0].text).toContain(
        "This PR adds a new feature to the system"
      )
      expect(result[0].text).toContain("## File Content Data")
      expect(result[0].text).toContain(
        "export function example() { return true; }"
      )

      // Second message (diff)
      expect(result[1].role).toBe("user")
      expect(result[1].text).toContain("## Diff")
      expect(result[1].text).toContain("src/example.ts")
      expect(result[1].text).toContain("@ -0,0 +1 @@")
    })

    test("Should not include file content when useFileContent is false", () => {
      // Create new Prompts instance with useFileContent: false
      const options: MockOptions = {
        language: "ja-JP",
        useFileContent: false,
        getFileTypePrompt: () => ""
      }
      const promptsNoContent = new Prompts(options as Options)

      // Mock data
      const mockContext = new PullRequestContext(
        "owner",
        "Add new feature",
        "repo",
        "This PR adds a new feature to the system",
        1,
        "base-commit-id",
        "head-commit-id"
      )

      const mockChangeFile: ChangeFile = {
        filename: "src/example.ts",
        content: "export function example() { return true; }",
        patch: "@ -0,0 +1 @@\n+export function example() { return true; }",
        summary: "",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "https://github.com/owner/repo/blob/sha/src/example.ts",
        diff: []
      }

      // Call the method
      const result = promptsNoContent.renderSummarizeFileDiff(
        mockContext,
        mockChangeFile
      )

      // Assert that file content section is properly handled
      expect(result[0].text).not.toContain(
        "## File Content Data\n\n```\nexport function example() { return true; }"
      )
    })
  })

  describe("renderReviewPrompt", () => {
    test("Should generate review prompt for file diff", () => {
      // Mock PR context
      const mockContext = new PullRequestContext(
        "owner",
        "Fix bug in authentication",
        "repo",
        "This PR fixes a bug in the authentication system",
        1,
        "base-commit-id",
        "head-commit-id"
      )

      // Mock file change
      const mockChangeFile: ChangeFile = {
        filename: "src/auth.ts",
        content:
          "export function authenticate(user: string, password: string) { return true; }",
        patch:
          "@ -0,0 +1 @@\n+export function authenticate(user: string, password: string) { return true; }",
        summary: "Added authentication function",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "https://github.com/owner/repo/blob/sha/src/auth.ts",
        diff: []
      }

      // Mock file diff with proper Hunk properties
      const mockFileDiff: FileDiff = {
        filename: "src/auth.ts",
        index: 1,
        from: {
          filename: "src/auth.ts",
          startLine: 1,
          lineCount: 1,
          content: ["// Authentication module"]
        },
        to: {
          filename: "src/auth.ts",
          startLine: 1,
          lineCount: 2,
          content: [
            "// Authentication module",
            "export function authenticate(user: string, password: string) { return true; }"
          ]
        }
      }

      // Call the method
      const result = prompts.renderReviewPrompt(
        mockContext,
        mockChangeFile,
        mockFileDiff
      )

      // Assertions
      expect(result).toHaveLength(2)

      // First message (prefix)
      expect(result[0].role).toBe("user")
      expect(result[0].cache).toBe(true)
      expect(result[0].text).toContain("## GitHub PR Title")
      expect(result[0].text).toContain("`Fix bug in authentication`")
      expect(result[0].text).toContain("## Description")
      expect(result[0].text).toContain(
        "This PR fixes a bug in the authentication system"
      )
      expect(result[0].text).toContain("## Summary of changes")
      expect(result[0].text).toContain("Added authentication function")
      expect(result[0].text).toContain("## Review Policy")
      expect(result[0].text).toContain("Be thorough and detailed")
      expect(result[0].text).toContain("## IMPORTANT Instructions")

      // Second message (diff)
      expect(result[1].role).toBe("user")
      expect(result[1].text).toContain(
        "## Changes made to `src/auth.ts` for your review"
      )
      expect(result[1].text).toContain("---new_hunk---")
      expect(result[1].text).toContain("---old_hunk---")
      expect(result[1].text).toContain("// Authentication module")
      expect(result[1].text).toContain(
        "export function authenticate(user: string, password: string) { return true; }"
      )
    })
  })

  describe("renderFileDiffHunk", () => {
    test("Should render file diff hunk with new and old content", () => {
      // Mock file diff with all required properties
      const mockFileDiff: FileDiff = {
        filename: "src/example.ts",
        index: 1,
        from: {
          filename: "src/example.ts",
          startLine: 1,
          lineCount: 3,
          content: ["function oldVersion() {", "  return false;", "}"]
        },
        to: {
          filename: "src/example.ts",
          startLine: 1,
          lineCount: 3,
          content: ["function newVersion() {", "  return true;", "}"]
        }
      }

      // Call the function
      const result = renderFileDiffHunk(mockFileDiff)

      // Assertions
      expect(result).toContain("---new_hunk---")
      expect(result).toContain(
        "```\nfunction newVersion() {\n  return true;\n}\n```"
      )
      expect(result).toContain("---old_hunk---")
      expect(result).toContain(
        "```\nfunction oldVersion() {\n  return false;\n}\n```"
      )
    })
  })

  describe("File Type Specific Prompts Integration", () => {
    test("Should include file type specific prompts in review prompt", () => {
      const options = {
        language: "en-US",
        useFileContent: true,
        reviewPolicy: "Be thorough and detailed",
        getFileTypePrompt: (filename: string) => {
          if (filename.endsWith(".ts")) {
            return "Focus on type safety and TypeScript best practices.\nCheck for proper interface definitions and generic usage.\nVerify strict mode compliance and null safety."
          }
          if (filename.endsWith(".js")) {
            return "Focus on ES6+ best practices and modern JavaScript patterns.\nCheck for proper async/await usage and error handling."
          }
          return ""
        },
        debug: false,
        disableReview: false,
        disableReleaseNotes: false,
        systemPrompt: "",
        summaryModel: [],
        model: [],
        retries: 0,
        timeoutMS: 0,
        summarizeReleaseNotes: "",
        releaseNotesTitle: "",
        localAction: false,
        commentGreeting: "",
        ignoreKeywords: [],
        baseURL: undefined,

        print: (): void => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        checkPath: (_path: string): boolean => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        includeIgnoreKeywords: (_description: string): boolean => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getFileType: (_filename: string): string => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        parseFileTypePrompts: (_input: string): Map<string, string> => {
          throw new Error("Function not implemented.")
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any

      const promptsWithFileType = new Prompts(options)

      const ctx = new PullRequestContext(
        "testowner",
        "Test PR Title",
        "testrepo",
        "Test PR Description",
        123,
        "base-sha",
        "head-sha"
      )

      const tsChange: ChangeFile = {
        filename: "src/component.ts",
        sha: "abc123",
        status: "modified",
        additions: 10,
        deletions: 5,
        changes: 15,
        url: "https://github.com/test/test/blob/abc123/src/component.ts",
        patch:
          "@@ -1,3 +1,4 @@\n interface User {}\n+interface Admin extends User {}",
        summary: "Added Admin interface",
        content: "interface User {}\ninterface Admin extends User {}",
        diff: []
      }

      const tsDiff: FileDiff = {
        filename: "src/component.ts",
        index: 1,
        from: {
          filename: "src/component.ts",
          startLine: 1,
          lineCount: 1,
          content: ["interface User {}"]
        },
        to: {
          filename: "src/component.ts",
          startLine: 1,
          lineCount: 2,
          content: ["interface User {}", "interface Admin extends User {}"]
        }
      }

      const tsResult = promptsWithFileType.renderReviewPrompt(
        ctx,
        tsChange,
        tsDiff
      )

      expect(tsResult[0].text).toContain("File Type Specific Guidelines")
      expect(tsResult[0].text).toContain(
        "Focus on type safety and TypeScript best practices"
      )
      expect(tsResult[0].text).toContain(
        "Check for proper interface definitions"
      )
      expect(tsResult[0].text).toContain("Verify strict mode compliance")
    })

    test("Should not include file type guidelines section when no prompt is available", () => {
      const options = {
        language: "en-US",
        useFileContent: false,
        reviewPolicy: "",
        getFileTypePrompt: () => "" // No file type prompts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any

      const promptsNoFileType = new Prompts(options)

      const ctx = new PullRequestContext(
        "testowner",
        "Test PR Title",
        "testrepo",
        "Test PR Description",
        123,
        "base-sha",
        "head-sha"
      )

      const change: ChangeFile = {
        filename: "src/unknown.xyz",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "https://github.com/test/test/blob/abc123/src/unknown.xyz",
        patch: "@@ -1,1 +1,2 @@\n line1\n+line2",
        summary: "Added line",
        content: "line1\nline2",
        diff: []
      }

      const diff: FileDiff = {
        filename: "src/unknown.xyz",
        index: 1,
        from: {
          filename: "src/unknown.xyz",
          startLine: 1,
          lineCount: 1,
          content: ["line1"]
        },
        to: {
          filename: "src/unknown.xyz",
          startLine: 1,
          lineCount: 2,
          content: ["line1", "line2"]
        }
      }

      const result = promptsNoFileType.renderReviewPrompt(ctx, change, diff)

      expect(result[0].text).not.toContain("File Type Specific Guidelines")
    })

    test("Should not include file type guidelines section when file_type_prompts is not specified", () => {
      // Create options with getFileTypePrompt that always returns empty string to simulate no file_type_prompts configuration
      const optionsWithoutFileTypePrompts = {
        language: "en-US",
        useFileContent: true,
        reviewPolicy: "Standard review policy",
        getFileTypePrompt: () => "", // Always return empty string to simulate missing file_type_prompts configuration
        debug: false,
        disableReview: false,
        disableReleaseNotes: false,
        systemPrompt: "",
        summaryModel: [],
        model: [],
        retries: 0,
        timeoutMS: 0,
        summarizeReleaseNotes: "",
        releaseNotesTitle: "",
        localAction: false,
        commentGreeting: "",
        ignoreKeywords: [],
        baseURL: undefined,

        print: (): void => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        checkPath: (_path: string): boolean => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        includeIgnoreKeywords: (_description: string): boolean => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getFileType: (_filename: string): string => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        parseFileTypePrompts: (_input: string): Map<string, string> => {
          throw new Error("Function not implemented.")
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any

      const promptsWithoutFileType = new Prompts(optionsWithoutFileTypePrompts)

      const ctx = new PullRequestContext(
        "testowner",
        "Test PR without file type prompts",
        "testrepo",
        "This PR should not include file type specific guidelines",
        789,
        "base-sha",
        "head-sha"
      )

      const change: ChangeFile = {
        filename: "src/example.ts",
        sha: "xyz789",
        status: "modified",
        additions: 5,
        deletions: 2,
        changes: 7,
        url: "https://github.com/test/test/blob/xyz789/src/example.ts",
        patch:
          "@@ -1,3 +1,4 @@\n function test() {\n+  console.log('test');\n }",
        summary: "Added console log",
        content: "function test() {\n  console.log('test');\n}",
        diff: []
      }

      const diff: FileDiff = {
        filename: "src/example.ts",
        index: 1,
        from: {
          filename: "src/example.ts",
          startLine: 1,
          lineCount: 2,
          content: ["function test() {", "}"]
        },
        to: {
          filename: "src/example.ts",
          startLine: 1,
          lineCount: 3,
          content: ["function test() {", "  console.log('test');", "}"]
        }
      }

      const result = promptsWithoutFileType.renderReviewPrompt(
        ctx,
        change,
        diff
      )

      // Should not contain file type specific guidelines section
      expect(result[0].text).not.toContain("File Type Specific Guidelines")

      // Should still contain other standard sections
      expect(result[0].text).toContain("## GitHub PR Title")
      expect(result[0].text).toContain("Test PR without file type prompts")
      expect(result[0].text).toContain("## Review Policy")
      expect(result[0].text).toContain("Standard review policy")
    })

    test("Should not include file type guidelines in summary when file_type_prompts is not specified", () => {
      // Create options with getFileTypePrompt that always returns empty string
      const optionsWithoutFileTypePrompts = {
        language: "en-US",
        useFileContent: true,
        getFileTypePrompt: () => "", // Always return empty string to simulate missing file_type_prompts configuration
        debug: false,
        disableReview: false,
        disableReleaseNotes: false,
        systemPrompt: "",
        summaryModel: [],
        model: [],
        retries: 0,
        timeoutMS: 0,
        summarizeReleaseNotes: "",
        releaseNotesTitle: "",
        localAction: false,
        commentGreeting: "",
        ignoreKeywords: [],
        baseURL: undefined,

        print: (): void => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        checkPath: (_path: string): boolean => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        includeIgnoreKeywords: (_description: string): boolean => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getFileType: (_filename: string): string => {
          throw new Error("Function not implemented.")
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        parseFileTypePrompts: (_input: string): Map<string, string> => {
          throw new Error("Function not implemented.")
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any

      const promptsWithoutFileType = new Prompts(optionsWithoutFileTypePrompts)

      const ctx = new PullRequestContext(
        "testowner",
        "Summary test without file type prompts",
        "testrepo",
        "Testing summary generation without file type prompts",
        456,
        "base-sha",
        "head-sha"
      )

      const change: ChangeFile = {
        filename: "src/utils.py",
        sha: "def789",
        status: "modified",
        additions: 8,
        deletions: 3,
        changes: 11,
        url: "https://github.com/test/test/blob/def789/src/utils.py",
        patch:
          "@@ -1,3 +1,4 @@\n def process_data(data):\n+    if not data:\n+        raise ValueError('Data cannot be empty')",
        summary: "",
        content:
          "def process_data(data):\n    if not data:\n        raise ValueError('Data cannot be empty')",
        diff: []
      }

      const result = promptsWithoutFileType.renderSummarizeFileDiff(ctx, change)

      // Should not contain file type specific guidelines section
      expect(result[0].text).not.toContain("File Type Specific Guidelines")

      // Should still contain other standard sections
      expect(result[0].text).toContain("## GitHub PR Title")
      expect(result[0].text).toContain("Summary test without file type prompts")
      expect(result[0].text).toContain("## File Content Data")
    })

    test("Should include file type prompts in summary generation", () => {
      const options = {
        language: "en-US",
        useFileContent: true,
        getFileTypePrompt: (filename: string) => {
          if (filename.endsWith(".py")) {
            return "Focus on PEP8 compliance and Python best practices.\nCheck for proper type hints and exception handling."
          }
          return ""
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any

      const promptsWithFileType = new Prompts(options)

      const ctx = new PullRequestContext(
        "testowner",
        "Python Enhancement",
        "testrepo",
        "Improved Python code quality",
        456,
        "base-sha",
        "head-sha"
      )

      const pyChange: ChangeFile = {
        filename: "src/utils.py",
        sha: "def789",
        status: "modified",
        additions: 8,
        deletions: 3,
        changes: 11,
        url: "https://github.com/test/test/blob/def789/src/utils.py",
        patch:
          "@@ -1,3 +1,4 @@\n def process_data(data):\n+    if not data:\n+        raise ValueError('Data cannot be empty')",
        summary: "",
        content:
          "def process_data(data):\n    if not data:\n        raise ValueError('Data cannot be empty')",
        diff: []
      }

      const result = promptsWithFileType.renderSummarizeFileDiff(ctx, pyChange)

      expect(result[0].text).toContain("File Type Specific Guidelines")
      expect(result[0].text).toContain(
        "Focus on PEP8 compliance and Python best practices"
      )
      expect(result[0].text).toContain(
        "Check for proper type hints and exception handling"
      )
    })
  })
})
