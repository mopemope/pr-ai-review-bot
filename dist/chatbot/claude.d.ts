import type { PullRequestContext } from "../context.js";
import type { Options } from "../option.js";
import { type ChatBot, type Message } from "./index.js";
export declare class ClaudeClient implements ChatBot {
    private client;
    private model;
    private options;
    constructor(options: Options);
    create(ctx: PullRequestContext, prompts: Message[]): Promise<string>;
}
