import { debug, warning } from "@actions/core"
import OpenAI from "openai"
import type { PullRequestContext } from "../context.js"
import type { Options } from "../option.js"
import { type ChatBot, type Message, getModelName } from "./index.js"

const apiKey = process.env.OPENAI_API_KEY || ""

export class OpenAIClient implements ChatBot {
  private client: OpenAI
  private options: Options
  private fullModelName: string
  private model: string

  constructor(modelName: string, options: Options) {
    this.fullModelName = modelName
    this.model = getModelName(modelName)
    this.options = options
    this.client = new OpenAI({
      apiKey: apiKey,
      timeout: options.timeoutMS,
      maxRetries: options.retries
    })
    if (options.baseURL) {
      this.client.baseURL = options.baseURL
    }
    if (this.options.debug) {
      debug(`Using model: ${modelName}`)
    }
  }

  getFullModelName(): string {
    return this.fullModelName
  }

  async create(ctx: PullRequestContext, prompts: Message[]): Promise<string> {
    try {
      const temperature = this.model == "o4-mini" ? 1 : undefined

      const body: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: this.model,
        messages: [
          { role: "system", content: this.options.systemPrompt } as const,
          ...prompts.map((prompt) => ({
            role: prompt.role as "user" | "assistant" | "system",
            content: prompt.text
          }))
        ]
        // max_tokens: 2000,
      }

      if (temperature) {
        body.temperature = temperature
      }
      // Call the OpenAI API
      const response = await this.client.chat.completions.create(body, {
        timeout: this.options.timeoutMS,
        maxRetries: this.options.retries
      })

      return response.choices[0]?.message?.content || ""
    } catch (error) {
      warning(
        `Failed to review code for : ${error instanceof Error ? error.message : String(error)}`
      )

      throw new Error("Failed to review this file due to an API error.")
    }
  }
}
