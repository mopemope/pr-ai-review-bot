import { getModelName } from "../../src/chatbot/index.js"
import { jest } from "@jest/globals"

// Mock creation
jest.mock("../../src/chatbot/openai.js")
jest.mock("../../src/chatbot/gemini.js")
jest.mock("../../src/chatbot/claude.js")

describe("ChatBot functions", () => {
  describe("getModelName", () => {
    it("Extracts the model part correctly from a model name with a provider prefix", () => {
      expect(getModelName("openai/gpt-4")).toBe("gpt-4")
      expect(getModelName("google/gemini-pro")).toBe("gemini-pro")
      expect(getModelName("anthropic/claude-3")).toBe("claude-3")
    })

    it("Returns the original string if there is no prefix", () => {
      expect(getModelName("gpt-4")).toBe("gpt-4")
    })

    it("Returns everything after the first slash if there are multiple slashes", () => {
      expect(getModelName("openai/gpt-4/preview")).toBe("gpt-4/preview")
    })
  })
})
