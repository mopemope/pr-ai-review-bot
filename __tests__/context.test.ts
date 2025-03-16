import { PullRequestContext } from "../src/context"

describe("PullRequestContext", () => {
  let context: PullRequestContext

  beforeEach(() => {
    // Executed before each test
    context = new PullRequestContext(
      "testOwner",
      "Test PR Title",
      "test-repo",
      "PR Description",
      123,
      "comment-123",
      "comment-456"
    )
  })

  test("Constructor should initialize correctly", () => {
    expect(context.owner).toBe("testOwner")
    expect(context.title).toBe("Test PR Title")
    expect(context.repo).toBe("test-repo")
    expect(context.description).toBe("PR Description")
    expect(context.pullRequestNumber).toBe(123)
    expect(context.baseCommitId).toBe("comment-123")
    expect(context.headCommitId).toBe("comment-456")
    expect(context.summary).toBe("")
    expect(context.fileSummaries).toEqual([])
  })

  test("appendChangeSummary should add file summary correctly", () => {
    context.appendChangeSummary("file1.ts", "Changed function A")

    expect(context.fileSummaries).toHaveLength(1)
    expect(context.fileSummaries[0]).toBe("### file1.ts\n\nChanged function A")

    context.appendChangeSummary("file2.ts", "Added new class B")

    expect(context.fileSummaries).toHaveLength(2)
    expect(context.fileSummaries[1]).toBe("### file2.ts\n\nAdded new class B")
  })

  test("getChangeSummary should concatenate all file summaries", () => {
    context.appendChangeSummary("file1.ts", "Changed function A")
    context.appendChangeSummary("file2.ts", "Added new class B")

    const expected =
      "### file1.ts\n\nChanged function A\n### file2.ts\n\nAdded new class B"
    expect(context.getChangeSummary()).toBe(expected)
  })

  test("getChangeSummary should return empty string for empty fileSummaries", () => {
    expect(context.getChangeSummary()).toBe("")
  })
})
