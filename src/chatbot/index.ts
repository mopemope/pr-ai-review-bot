// This module defines the ChatBot interface and factory function to create chatbot instances

import type { PullRequestContext } from "../context.js"
import type { Options } from "../option.js"
import { ClaudeClient } from "./claude.js"
import { GeminiClient } from "./gemini.js"
import { OpenAIClient } from "./openai.js"

/**
 * Type providing a message structure for the chatbot.
 */
export type Message = {
  text: string
  role: string
  // if true, prompt will be cached. default is false
  cache?: boolean
}

/**
 * Interface for chatbot clients that can review code
 */
export interface ChatBot {
  create(ctx: PullRequestContext, prompts: Message[]): Promise<string>
}

/**
 * Extract the model name from a full model identifier string
 * @param name - Full model identifier in "provider/model" format
 * @returns The model portion of the identifier, or the original string if no provider prefix is found.
 */
export const getModelName = (name: string): string => {
  const parts = name.split("/")
  return parts.length > 1 ? parts[1] : name
}

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
  if (modelName.startsWith("openai/")) {
    return new OpenAIClient(options)
  }
  if (modelName.startsWith("google/")) {
    return new GeminiClient(options)
  }
  if (modelName.startsWith("anthropic/")) {
    return new ClaudeClient(options)
  }

  throw new Error(`Unsupported model: ${modelName}`)
}
