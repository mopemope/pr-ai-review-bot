import { debug, warning } from "@actions/core"
import { type GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai"
import type { PullRequestContext } from "../context.js"
import type { Options } from "../option.js"
import { type ChatBot, type Message, getModelName } from "./index.js"

const apiKey = process.env.GEMINI_API_KEY || ""

export class GeminiClient implements ChatBot {
  private client: GoogleGenerativeAI
  private model: GenerativeModel
  private options: Options
  private fullModelName: string

  constructor(modelName: string, options: Options) {
    this.fullModelName = modelName
    this.options = options
    this.client = new GoogleGenerativeAI(apiKey)
    const geminiModel = getModelName(modelName)
    this.model = this.client.getGenerativeModel({
      systemInstruction: {
        text: options.systemPrompt // System prompt for the model
      },
      model: geminiModel
    })

    if (this.options.debug) {
      debug("Gemini client initialized")
      debug(`Using model: ${modelName}`)
    }
  }

  getFullModelName(): string {
    return this.fullModelName
  }

  async create(ctx: PullRequestContext, prompts: Message[]): Promise<string> {
    try {
      // TODO contents caching
      // Call the Gemini API
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: prompts.map((prompt) => ({
              text: prompt.text
            }))
          }
        ],
        generationConfig: {
          temperature: 0.1
          // maxOutputTokens: 2000,
        }
      })

      return result.response.text()
    } catch (error) {
      warning(
        `Failed to review code for: ${error instanceof Error ? error.message : String(error)}`
      )

      // Retry logic
      if (this.options.retries > 0) {
        this.options.retries--
        return this.create(ctx, prompts)
      }

      return "Failed to review this file due to an API error."
    }
  }
}
