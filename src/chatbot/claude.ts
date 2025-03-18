import { debug, warning } from "@actions/core"
import Anthropic from "@anthropic-ai/sdk"
import type { TextBlockParam } from "@anthropic-ai/sdk/resources/index.mjs"
import type { PullRequestContext } from "../context.js"
import type { Options } from "../option.js"
import { type ChatBot, type Message, getModelName } from "./index.js"
import { sleep } from "openai/core.mjs"

const apiKey = process.env.ANTHROPIC_API_KEY || ""

export class ClaudeClient implements ChatBot {
  private client: Anthropic
  private model: string
  private options: Options
  private fullModelName: string
  private retries: number

  constructor(modelName: string, options: Options) {
    this.fullModelName = modelName
    this.options = options
    this.client = new Anthropic({
      apiKey: apiKey
    })
    this.model = getModelName(modelName)
    this.retries = options.retries

    if (this.options.debug) {
      debug("Claude client initialized")
      debug(`Using model: ${this.model}`)
    }
  }

  getFullModelName(): string {
    return this.fullModelName
  }

  async create(ctx: PullRequestContext, prompts: Message[]): Promise<string> {
    try {
      // Call Claude API
      const result = await this.client.messages.create({
        model: this.model,
        system: this.options.systemPrompt,
        messages: [
          {
            role: "user",
            content: prompts.map((prompt) => {
              return {
                cache_control: prompt.cache ? { type: "ephemeral" } : null,
                text: prompt.text,
                type: "text"
              } satisfies TextBlockParam
            })
          }
        ],
        max_tokens: 8192,
        temperature: 0.1
      })

      const res = result.content[0]
      // reset retries
      this.retries = this.options.retries
      return res.type === "text" ? res.text : ""
    } catch (error) {
      warning(
        `Failed to review code for : ${error instanceof Error ? error.message : String(error)}`
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
