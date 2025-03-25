import { debug, info, warning } from "@actions/core"
import Anthropic from "@anthropic-ai/sdk"
import type { TextBlockParam } from "@anthropic-ai/sdk/resources/index.mjs"
import type { PullRequestContext } from "../context.js"
import type { Options } from "../option.js"
import { type ChatBot, type Message, getModelName } from "./index.js"

const apiKey = process.env.ANTHROPIC_API_KEY || ""

export class ClaudeClient implements ChatBot {
  private client: Anthropic
  private model: string
  private options: Options
  private fullModelName: string

  constructor(modelName: string, options: Options) {
    this.fullModelName = modelName
    this.options = options
    this.client = new Anthropic({
      apiKey: apiKey,
      timeout: options.timeoutMS
    })
    this.model = getModelName(modelName)

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
      const result = await this.client.messages.create(
        {
          model: this.model,
          system: [
            {
              type: "text",
              text: this.options.systemPrompt,
              cache_control: {
                type: "ephemeral" // Cache the system prompt for the session
              }
            }
          ],
          messages: [
            {
              role: "user",
              content: prompts.map((prompt) => {
                const block: TextBlockParam = {
                  text: prompt.text,
                  type: "text"
                }
                if (prompt.cache) {
                  block.cache_control = { type: "ephemeral" }
                }
                return block
              })
            }
          ],
          max_tokens: 8192,
          temperature: 0.1
        },
        { timeout: this.options.timeoutMS, maxRetries: this.options.retries }
      )

      const usage = JSON.stringify(result.usage, null, 2)
      if (this.options.debug) {
        info(`Claude usage: ${usage}`)
      }
      const res = result.content[0]
      return res.type === "text" ? res.text : ""
    } catch (error) {
      warning(
        `Failed to review code for : ${error instanceof Error ? error.message : String(error)}`
      )

      throw new Error("Failed to review this file due to an API error.")
    }
  }
}
