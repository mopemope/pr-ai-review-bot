import { getModelName } from "../src/chatbot"

describe("chatbot module", () => {
  describe("getModelName", () => {
    it("should extract model name from provider/model format", () => {
      expect(getModelName("openai/gpt-4")).toBe("gpt-4")
      expect(getModelName("google/gemini-pro")).toBe("gemini-pro")
      expect(getModelName("anthropic/claude-2")).toBe("claude-2")
    })

    it("should handle model names with multiple slashes", () => {
      expect(getModelName("openai/gpt-4/latest")).toBe("gpt-4/latest")
      expect(getModelName("google/gemini/pro/v2")).toBe("gemini/pro/v2")
    })

    it("should return original string if no provider prefix is found", () => {
      expect(getModelName("gpt-4")).toBe("gpt-4")
      expect(getModelName("claude-instant")).toBe("claude-instant")
      expect(getModelName("")).toBe("")
    })
  })
})
