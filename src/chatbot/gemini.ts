import { debug, warning } from "@actions/core"
import { type GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai"
import type { PullRequestContext } from "../context.js"
import type { Options } from "../option.js"
import { sleep } from "../utils.js"
import { type ChatBot, type Message, getModelName } from "./index.js"

const apiKey = process.env.GEMINI_API_KEY || ""

export class GeminiClient implements ChatBot {
  private client: GoogleGenerativeAI
  private model: GenerativeModel
  private options: Options
  private fullModelName: string
  private retries: number

  constructor(modelName: string, options: Options) {
    this.fullModelName = modelName
    this.options = options
    this.client = new GoogleGenerativeAI(apiKey)
    this.retries = options.retries

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
      // Call the Gemini API
      const result = await this.model.generateContent(
        {
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
        },
        {
          timeout: this.options.timeoutMS
        }
      )
      // reset retries
      this.retries = this.options.retries
      return result.response.text()
    } catch (error) {
      warning(
        `Failed to review code for: ${error instanceof Error ? error.message : String(error)}`
      )

      // Retry logic
      if (this.retries > 0) {
        this.retries--
        await sleep(1000) // wait for 1 second before retrying
        return this.create(ctx, prompts)
      }

      throw new Error("Failed to review this file due to an API error.")
    }
  }
}
