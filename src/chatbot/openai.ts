import { debug, warning } from "@actions/core"
import OpenAI from "openai"
import type { PullRequestContext } from "../context.js"
import type { Options } from "../option.js"
import { type ChatBot, type Message, getModelName } from "./index.js"

const apiKey = process.env.OPENAI_API_KEY || ""

export class OpenAIClient implements ChatBot {
  private client: OpenAI
  private options: Options

  constructor(options: Options) {
    const modelName = getModelName(options.model)
    this.options = options
    this.client = new OpenAI({
      apiKey: apiKey
    })

    if (this.options.debug) {
      debug(`Using model: ${modelName}`)
    }
  }

  async create(ctx: PullRequestContext, prompts: Message[]): Promise<string> {
    try {
      // Call the OpenAI API
      const response = await this.client.chat.completions.create({
        model: getModelName(this.options.model),
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

      return response.choices[0]?.message?.content || ""
    } catch (error) {
      warning(
        `Failed to review code for : ${error instanceof Error ? error.message : String(error)}`
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
