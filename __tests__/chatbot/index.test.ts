import {
  getModelName,
  createChatBotFromModel
} from "../../src/chatbot/index.js"
import { jest } from "@jest/globals"
import { OpenAIClient } from "../../src/chatbot/openai.js"
import { GeminiClient } from "../../src/chatbot/gemini.js"
import { ClaudeClient } from "../../src/chatbot/claude.js"
import { Options } from "../../src/option.js"

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

  describe("createChatBotFromModel", () => {
    let mockOptions: Options

    beforeEach(() => {
      jest.clearAllMocks()
      // 実際の Options インスタンスを作成
      mockOptions = new Options(
        false, // debug
        false, // disableReview
        false, // disableReleaseNotes
        [], // pathFilters
        "Test prompt", // systemPrompt
        ["openai/gpt-4"], // summaryModel
        ["openai/gpt-3.5-turbo"], // model
        "3", // retries
        "60000", // timeoutMS
        "en", // language
        "yes", // summarizeReleaseNotes
        "Release Notes", // releaseNotesTitle
        true, // useFileContent
        "default", // reviewPolicy
        "Hello", // commentGreeting
        [], // ignoreKeywords
        undefined // baseURL
      )
    })

    it("Creates an OpenAIClient for openai prefixed models", () => {
      const chatbot = createChatBotFromModel("openai/gpt-4", mockOptions)
      expect(chatbot).toBeInstanceOf(OpenAIClient)
    })

    it("Creates an OpenAIClient for openrouter prefixed models", () => {
      const chatbot = createChatBotFromModel("openrouter/mistral", mockOptions)
      expect(chatbot).toBeInstanceOf(OpenAIClient)
    })

    it("Creates a GeminiClient for google prefixed models", () => {
      const chatbot = createChatBotFromModel("google/gemini-pro", mockOptions)
      expect(chatbot).toBeInstanceOf(GeminiClient)
    })

    it("Creates a ClaudeClient for anthropic prefixed models", () => {
      const chatbot = createChatBotFromModel("anthropic/claude-3", mockOptions)
      expect(chatbot).toBeInstanceOf(ClaudeClient)
    })

    it("Throws an error for unsupported models", () => {
      expect(() => {
        createChatBotFromModel("unsupported/model", mockOptions)
      }).toThrow("Unsupported model: unsupported/model")
    })
  })
})
