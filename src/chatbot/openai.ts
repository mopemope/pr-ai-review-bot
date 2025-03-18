import { debug, warning } from "@actions/core"
import OpenAI from "openai"
import type { PullRequestContext } from "../context.js"
import type { Options } from "../option.js"
import { type ChatBot, type Message, getModelName } from "./index.js"
import { sleep } from "openai/core.mjs"

const apiKey = process.env.OPENAI_API_KEY || ""

export class OpenAIClient implements ChatBot {
  private client: OpenAI
  private options: Options
  private fullModelName: string
  private model: string
  private retries: number

  constructor(modelName: string, options: Options) {
    this.fullModelName = modelName
    this.model = getModelName(modelName)
    this.retries = options.retries
    this.options = options
    this.client = new OpenAI({
      apiKey: apiKey
    })

    if (this.options.debug) {
      debug(`Using model: ${modelName}`)
    }
  }

  getFullModelName(): string {
    return this.fullModelName
  }

  async create(ctx: PullRequestContext, prompts: Message[]): Promise<string> {
    try {
      // Call the OpenAI API
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: this.options.systemPrompt } as const,
          ...prompts.map((prompt) => ({
            role: prompt.role as "user" | "assistant" | "system",
            content: prompt.text
          }))
        ],
        temperature: 0.1
        // max_tokens: 2000,
      })
      // reset retries
      this.retries = this.options.retries
      return response.choices[0]?.message?.content || ""
    } catch (error) {
      warning(
        `Failed to review code for : ${error instanceof Error ? error.message : String(error)}`
      )

      // Retry logic
      if (this.retries > 0) {
        this.retries--
        await sleep(1000) // Wait for 1 second before retrying
        return this.create(ctx, prompts)
      }

      throw new Error("Failed to review this file due to an API error.")
    }
  }
}
