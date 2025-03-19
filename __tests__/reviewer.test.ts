import { parseReviewComment } from "../src/reviewer"

/**
 * Unit tests for parseReviewComment function
 */
describe("parseReviewComment", () => {
  /**
   * Tests if a single comment is parsed correctly
   */
  it("correctly parses a single comment", () => {
    const input = `10-15:
Code indentation is inappropriate. Please fix it.`

    const result = parseReviewComment("filename", input)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      filename: "filename",
      startLine: 10,
      endLine: 15,
      comment: "Code indentation is inappropriate. Please fix it.",
      isLGTM: false
    })
  })

  /**
   * Tests that comments with invalid line ranges (startLine > endLine) are skipped
   */
  it("skips comments with invalid line ranges", () => {
    const input = `15-10:
This has an invalid line range and should be skipped.
---
20-25:
This has a valid line range and should be included.`

    const result = parseReviewComment("filename", input)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      filename: "filename",
      startLine: 20,
      endLine: 25,
      comment: "This has a valid line range and should be included.",
      isLGTM: false
    })
  })

  /**
   * Tests if multiple comments are parsed correctly
   */
  it("correctly parses multiple comments", () => {
    const input = `10-15:
Code indentation is inappropriate. Please fix it.
---
20-25:
Variable name is unclear. Please consider a more descriptive name.`

    const result = parseReviewComment("filename", input)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      filename: "filename",
      startLine: 10,
      endLine: 15,
      comment: "Code indentation is inappropriate. Please fix it.",
      isLGTM: false
    })
    expect(result[1]).toEqual({
      filename: "filename",
      startLine: 20,
      endLine: 25,
      comment:
        "Variable name is unclear. Please consider a more descriptive name.",
      isLGTM: false
    })
  })

  /**
   * Tests if LGTM flag is correctly identified
   */
  it("correctly identifies LGTM flag", () => {
    const input = `10-15:
LGTM! Code is clean and easy to understand.
---
20-25:
This implementation has room for improvement.`

    const result = parseReviewComment("filename", input)

    expect(result).toHaveLength(2)
    expect(result[0].isLGTM).toBe(true)
    expect(result[1].isLGTM).toBe(false)
  })

  /**
   * Tests if multi-line comments are parsed correctly
   */
  it("correctly parses multi-line comments", () => {
    const input = `10-15:
This is a multi-line
comment.
It describes code review content
in detail.
---
20-25:
Another comment`

    const result = parseReviewComment("filename", input)

    expect(result).toHaveLength(2)
    expect(result[0].comment).toBe(
      "This is a multi-line\ncomment.\nIt describes code review content\nin detail."
    )
    expect(result[1].comment).toBe("Another comment")
  })

  /**
   * Tests if empty input returns an empty array
   */
  it("returns empty array for empty input", () => {
    expect(parseReviewComment("filename", "")).toEqual([])
    expect(parseReviewComment("filename", "   ")).toEqual([])
  })

  /**
   * Tests if sections with invalid format are skipped
   */
  it("skips sections with invalid format", () => {
    const input = `10-15:
Valid comment
---
Invalid format
---
20-25:
Another comment`

    const result = parseReviewComment("filename", input)

    expect(result).toHaveLength(2)
    expect(result[0].startLine).toBe(10)
    expect(result[1].startLine).toBe(20)
  })

  /**
   * Tests if comments containing diff code blocks are parsed correctly
   */
  it("correctly parses comments containing diff code blocks", () => {
    const input = `45-45:
Inappropriate variable name. Please use more descriptive names.
\`\`\`diff
-        const x = calculateValue();
+        const calculatedTotal = calculateValue();
\`\`\``

    const result = parseReviewComment("filename", input)

    expect(result).toHaveLength(1)
    expect(result[0].comment).toContain("```diff")
    expect(result[0].comment).toContain(
      "+        const calculatedTotal = calculateValue();"
    )
  })

  /**
   * Tests that comments with non-numeric line numbers are skipped
   */
  it("skips comments with non-numeric line numbers", () => {
    const input = `abc-15:
This has invalid line numbers and should be skipped.
---
20-xyz:
This also has invalid line numbers and should be skipped.
---
20-25:
This has valid line numbers and should be included.`

    const result = parseReviewComment("filename", input)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      filename: "filename",
      startLine: 20,
      endLine: 25,
      comment: "This has valid line numbers and should be included.",
      isLGTM: false
    })
  })

  /**
   * Tests that line ranges without comment text are skipped
   */
  it("skips line ranges without comment text", () => {
    const input = `10-15:
---
20-25:
Valid comment with text
---
30-35:`

    const result = parseReviewComment("filename", input)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      filename: "filename",
      startLine: 20,
      endLine: 25,
      comment: "Valid comment with text",
      isLGTM: false
    })
  })

  /**
   * Tests that LGTM detection is case-insensitive
   */
  it("identifies LGTM flag case-insensitively", () => {
    const input = `10-15:
lgtm! Lowercase is fine
---
20-25:
LGTM! Uppercase works too
---
30-35:
LgTm! Mixed case is also good`

    const result = parseReviewComment("filename", input)

    expect(result).toHaveLength(3)
    expect(result[0].isLGTM).toBe(true)
    expect(result[1].isLGTM).toBe(true)
    expect(result[2].isLGTM).toBe(true)
  })
})
