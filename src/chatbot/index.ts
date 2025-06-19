// This module defines the ChatBot interface and factory function to create chatbot instances

import type { Options } from "../option.js"
import { ClaudeClient } from "./claude.js"
import { GeminiClient } from "./gemini.js"
import { OpenAIClient } from "./openai.js"
import type { ChatBot } from "./types.js"

// Re-export types and functions from types.ts
export type { ChatBot, Message } from "./types.js"
export { getModelName } from "./types.js"

/**
 * Factory function to create appropriate ChatBot implementation based on model name
 * @param modelName - Name of the model to use (prefixed with provider name)
 * @param options - Configuration options
 * @returns ChatBot implementation for the specified model
 * @throws Error if the model is not supported
 */
export const createChatBotFromModel = (
  modelName: string,
  options: Options
): ChatBot => {
  if (modelName.startsWith("openai/") || modelName.startsWith("openrouter/")) {
    return new OpenAIClient(modelName, options)
  }
  if (modelName.startsWith("google/")) {
    return new GeminiClient(modelName, options)
  }
  if (modelName.startsWith("anthropic/")) {
    return new ClaudeClient(modelName, options)
  }

  throw new Error(`Unsupported model: ${modelName}`)
}
