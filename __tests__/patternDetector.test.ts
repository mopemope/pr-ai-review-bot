import { describe, expect, it } from "@jest/globals"
import { PatternDetector } from "../src/patternDetector.js"
import type { ChangeFile } from "../src/types.js"

describe("PatternDetector", () => {
  let detector: PatternDetector

  beforeEach(() => {
    detector = new PatternDetector()
  })

  describe("Security Pattern Detection", () => {
    it("should detect SQL injection risks", () => {
      const change: ChangeFile = {
        filename: "test.js",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "http://example.com",
        patch: "const query = `SELECT * FROM users WHERE id = ${userId}`",
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)

      expect(result.patterns).toHaveLength(1)
      expect(result.patterns[0].subType).toBe("sql_injection_risk")
      expect(result.patterns[0].severity).toBe("critical")
      expect(result.riskLevel).toBe("critical")
    })

    it("should detect XSS risks", () => {
      const change: ChangeFile = {
        filename: "test.js",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "http://example.com",
        patch: "element.innerHTML = userInput",
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)

      expect(result.patterns).toHaveLength(1)
      expect(result.patterns[0].subType).toBe("xss_risk")
      expect(result.patterns[0].severity).toBe("high")
      expect(result.riskLevel).toBe("high")
    })

    it("should detect hardcoded secrets", () => {
      const change: ChangeFile = {
        filename: "config.js",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "http://example.com",
        patch: 'const apiKey = "sk-1234567890abcdef"',
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)

      expect(result.patterns).toHaveLength(1)
      expect(result.patterns[0].subType).toBe("hardcoded_secrets")
      expect(result.patterns[0].severity).toBe("critical")
    })
  })

  describe("Performance Pattern Detection", () => {
    it("should detect N+1 query problems", () => {
      const change: ChangeFile = {
        filename: "service.js",
        sha: "abc123",
        status: "modified",
        additions: 3,
        deletions: 0,
        changes: 3,
        url: "http://example.com",
        patch: `
          for (const user of users) {
            const profile = await db.query('SELECT * FROM profiles WHERE user_id = ?', user.id)
          }
        `,
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)

      expect(result.patterns).toHaveLength(1)
      expect(result.patterns[0].subType).toBe("n_plus_one_query")
      expect(result.patterns[0].severity).toBe("high")
    })

    it("should detect memory leak risks", () => {
      const change: ChangeFile = {
        filename: "component.js",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "http://example.com",
        patch: "element.addEventListener('click', handler)",
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)

      expect(result.patterns).toHaveLength(1)
      expect(result.patterns[0].subType).toBe("memory_leak_risk")
      expect(result.patterns[0].severity).toBe("medium")
    })

    it("should detect blocking operations", () => {
      const change: ChangeFile = {
        filename: "file-handler.js",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "http://example.com",
        patch: "const data = fs.readFileSync('large-file.txt')",
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)

      expect(result.patterns).toHaveLength(1)
      expect(result.patterns[0].subType).toBe("blocking_operation")
      expect(result.patterns[0].severity).toBe("medium")
    })
  })

  describe("Risk Level Calculation", () => {
    it("should return critical risk for critical patterns", () => {
      const change: ChangeFile = {
        filename: "test.js",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "http://example.com",
        patch: "const query = `SELECT * FROM users WHERE id = ${userId}`",
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)
      expect(result.riskLevel).toBe("critical")
    })

    it("should return low risk for no patterns", () => {
      const change: ChangeFile = {
        filename: "test.js",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "http://example.com",
        patch: "const message = 'Hello, world!'",
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)
      expect(result.riskLevel).toBe("low")
      expect(result.patterns).toHaveLength(0)
    })
  })

  describe("Recommended Focus Generation", () => {
    it("should generate security focus areas for security patterns", () => {
      const change: ChangeFile = {
        filename: "test.js",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "http://example.com",
        patch: "const query = `SELECT * FROM users WHERE id = ${userId}`",
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)

      expect(result.recommendedFocus).toContain(
        "Security vulnerabilities and input validation"
      )
      expect(result.recommendedFocus).toContain(
        "Database query security and parameterization"
      )
    })

    it("should generate performance focus areas for performance patterns", () => {
      const change: ChangeFile = {
        filename: "service.js",
        sha: "abc123",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        url: "http://example.com",
        patch: "const data = fs.readFileSync('file.txt')",
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)

      expect(result.recommendedFocus).toContain(
        "Performance optimization and efficiency"
      )
      expect(result.recommendedFocus).toContain(
        "Asynchronous programming and non-blocking operations"
      )
    })
  })

  describe("Pattern Formatting", () => {
    it("should format patterns for review display", () => {
      const change: ChangeFile = {
        filename: "test.js",
        sha: "abc123",
        status: "modified",
        additions: 2,
        deletions: 0,
        changes: 2,
        url: "http://example.com",
        patch: `
          const query = \`SELECT * FROM users WHERE id = \${userId}\`
          element.innerHTML = userInput
        `,
        diff: [],
        summary: "",
        content: undefined
      }

      const result = detector.detectPatterns(change)
      const formatted = detector.formatPatternsForReview(result.patterns)

      expect(formatted).toContain("**Security Concerns:**")
      expect(formatted).toContain(
        "Potential SQL injection vulnerability detected"
      )
      expect(formatted).toContain("Potential XSS vulnerability detected")
      expect(formatted).toContain("Severity: critical")
      expect(formatted).toContain("Severity: high")
    })

    it("should return empty string for no patterns", () => {
      const formatted = detector.formatPatternsForReview([])
      expect(formatted).toBe("")
    })
  })
})
