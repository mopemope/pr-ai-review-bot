import type { PullRequestContext } from "../context.js";
import type { Options } from "../option.js";
import { type ChatBot, type Message } from "./index.js";
export declare class GeminiClient implements ChatBot {
    private client;
    private model;
    private options;
    constructor(modelName: string, options: Options);
    create(ctx: PullRequestContext, prompts: Message[]): Promise<string>;
}
