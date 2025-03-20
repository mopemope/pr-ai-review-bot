import { jest } from "@jest/globals"
import { Options, PathFilter } from "../src/option"

jest.mock("@actions/core")

describe("Options", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("constructor", () => {
    it("should correctly initialize options", () => {
      const options = new Options(
        true,
        false,
        true,
        ["src/**/*.ts", "!src/**/*.test.ts"],
        "system prompt",
        ["gpt-4-1106-preview"],
        ["gpt-3.5-turbo"],
        "3",
        "60000",
        "ja",
        "Please summarize the changes",
        "Release Notes Title",
        true,
        "review policy",
        "default greeting",
        ["keyword1", "keyword2"],
        ""
      )

      expect(options.debug).toBe(true)
      expect(options.disableReview).toBe(false)
      expect(options.disableReleaseNotes).toBe(true)
      const expectedRules = [
        ["src/**/*.ts", false],
        ["src/**/*.test.ts", true]
      ]
      expect(JSON.parse(options.pathFilters.toString())).toEqual(expectedRules)
      expect(options.systemPrompt).toBe("system prompt")
      expect(options.summaryModel).toStrictEqual(["gpt-4-1106-preview"])
      expect(options.model).toStrictEqual(["gpt-3.5-turbo"])
      expect(options.retries).toBe(3)
      expect(options.timeoutMS).toBe(60000)
      expect(options.language).toBe("ja")
      expect(options.summarizeReleaseNotes).toBe("Please summarize the changes")
      expect(options.reviewPolicy).toBe("review policy")
      expect(options.commentGreeting).toBe("default greeting")
      expect(options.ignoreKeywords).toEqual(["keyword1", "keyword2"])
    })
  })

  describe("checkPath", () => {
    it("should allow paths matching the path filter", () => {
      const options = new Options(
        false,
        false,
        false,
        ["src/**/*.ts", "!src/**/*.test.ts"],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        true,
        "review policy",
        "",
        [],
        undefined
      )

      expect(options.checkPath("src/main.ts")).toBe(true)
      expect(options.checkPath("src/utils/helper.ts")).toBe(true)
      expect(options.checkPath("src/main.test.ts")).toBe(false)
      expect(options.checkPath("dist/main.js")).toBe(false)

      // Verify debug was called
      // expect(mockedCore.debug).toHaveBeenCalledTimes(4);
    })
  })
})

describe("PathFilter", () => {
  describe("constructor", () => {
    it("should use empty array when rules are null", () => {
      const filter = new PathFilter(null)
      expect(filter.toString()).toBe("[]")
    })

    it("should correctly parse provided rules", () => {
      const filter = new PathFilter([
        "src/**/*.ts",
        "!src/**/*.test.ts",
        " !dist/ ", // Rule with whitespace
        "" // Empty rule
      ])

      expect(JSON.parse(filter.toString())).toEqual([
        ["src/**/*.ts", false],
        ["src/**/*.test.ts", true],
        ["dist/", true]
      ])
    })
  })

  describe("check", () => {
    it("should always return true when there are no rules", () => {
      const filter = new PathFilter([])
      expect(filter.check("any/path.ts")).toBe(true)
    })

    it("should return true only for matching paths when only include rules exist", () => {
      const filter = new PathFilter(["src/**/*.ts", "doc/**/*.md"])
      expect(filter.check("src/file.ts")).toBe(true)
      expect(filter.check("doc/readme.md")).toBe(true)
      expect(filter.check("other/file.js")).toBe(false)
    })

    it("should return false for paths matching exclude rules", () => {
      const filter = new PathFilter(["src/**/*.ts", "!src/**/*.test.ts"])
      expect(filter.check("src/file.ts")).toBe(true)
      expect(filter.check("src/file.test.ts")).toBe(false)
    })

    it("should return true only for paths not matching exclude rules when no include rules exist", () => {
      const filter = new PathFilter(["!src/**/*.test.ts"])
      expect(filter.check("src/file.ts")).toBe(true)
      expect(filter.check("src/file.test.ts")).toBe(false)
      expect(filter.check("other/file.js")).toBe(true)
    })
  })
})
