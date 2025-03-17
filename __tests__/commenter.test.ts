import type { GitHub } from "@actions/github/lib/utils"
import { jest } from "@jest/globals"
import {
  COMMIT_ID_END_TAG,
  COMMIT_ID_START_TAG,
  Commenter
} from "../src/commenter"
import type { PullRequestContext } from "../src/context"
import type { Options } from "../src/option"

// Mock objects
const mockOctokit = {
  rest: {
    issues: {
      createComment: jest.fn(),
      updateComment: jest.fn(),
      listComments: jest.fn()
    },
    pulls: {
      get: jest.fn(),
      update: jest.fn(),
      listCommits: jest.fn(),
      createReviewComment: jest.fn()
    }
  }
}

describe("Commenter", () => {
  let commenter: Commenter
  let mockOptions: Options
  let mockPrContext: PullRequestContext

  beforeEach(() => {
    // Set up test mocks
    mockOptions = {
      commentGreeting: "Hello!",
      releaseNotesTitle: "Release Notes"
    } as Options

    mockPrContext = {
      owner: "testOwner",
      repo: "testRepo",
      pullRequestNumber: 123,
      headCommitId: "abc123",
      getCommitSummary: jest.fn().mockReturnValue("Test commit summary"),
      summaryCommentId: undefined
    } as unknown as PullRequestContext

    // Create Commenter instance
    commenter = new Commenter(
      mockOptions,
      mockOctokit as unknown as InstanceType<typeof GitHub>,
      mockPrContext
    )

    // Reset all mocks
    jest.clearAllMocks()
  })

  describe("getReviewedCommitIds", () => {
    it("extracts commit IDs from comment", () => {
      const commentBody = `Some text ${COMMIT_ID_START_TAG}<!-- abc123 --><!-- def456 -->${COMMIT_ID_END_TAG} more text`
      const result = commenter.getReviewedCommitIds(commentBody)
      expect(result).toEqual(["abc123", "def456"])
    })

    it("returns empty array when tags are not found", () => {
      const commentBody = "Comment without tags"
      const result = commenter.getReviewedCommitIds(commentBody)
      expect(result).toEqual([])
    })
  })

  describe("getReviewedCommitIdsBlock", () => {
    it("extracts the entire commit ID block", () => {
      const block = `${COMMIT_ID_START_TAG}<!-- abc123 -->${COMMIT_ID_END_TAG}`
      const commentBody = `Text before ${block} text after`
      const result = commenter.getReviewedCommitIdsBlock(commentBody)
      expect(result).toBe(block)
    })

    it("returns empty string when tags are not found", () => {
      const commentBody = "Comment without tags"
      const result = commenter.getReviewedCommitIdsBlock(commentBody)
      expect(result).toBe("")
    })
  })

  describe("removeContentWithinTags", () => {
    it("removes content between specified tags", () => {
      const content = "Before <START>Content to remove<END> After"
      const result = commenter.removeContentWithinTags(
        content,
        "<START>",
        "<END>"
      )
      expect(result).toBe("Before  After")
    })

    it("returns original content when tags are not found", () => {
      const content = "Content without tags"
      const result = commenter.removeContentWithinTags(
        content,
        "<START>",
        "<END>"
      )
      expect(result).toBe(content)
    })
  })

  describe("addReviewedCommitId", () => {
    it("adds new commit ID", () => {
      const comment = "Test comment"
      const commitId = "abc123"
      const result = commenter.addReviewedCommitId(comment, commitId)
      expect(result).toContain(COMMIT_ID_START_TAG)
      expect(result).toContain(`<!-- ${commitId} -->`)
      expect(result).toContain(COMMIT_ID_END_TAG)
    })

    it("adds commit ID to existing commit list", () => {
      const existingId = "existing123"
      const newId = "new456"
      const comment = `Comment ${COMMIT_ID_START_TAG}<!-- ${existingId} -->${COMMIT_ID_END_TAG}`
      const result = commenter.addReviewedCommitId(comment, newId)
      expect(result).toContain(`<!-- ${existingId} -->`)
      expect(result).toContain(`<!-- ${newId} -->`)
    })
  })

  describe("comment", () => {
    it("creates a new comment", async () => {
      await commenter.comment({
        message: "Test comment",
        tag: "testTag",
        mode: "create"
      })

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: "testOwner",
        repo: "testRepo",
        issue_number: 123,
        body: expect.stringContaining("Test comment")
      })
    })

    it("updates an existing comment", async () => {
      const commentId = 456
      await commenter.comment({
        message: "Updated comment",
        mode: "update",
        commentId
      })

      expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
        owner: "testOwner",
        repo: "testRepo",
        comment_id: commentId,
        body: expect.stringContaining("Updated comment")
      })
    })
  })
})
