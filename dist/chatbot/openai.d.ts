import type { PullRequestContext } from "../context.js";
import type { Options } from "../option.js";
import type { ChatBot, Message } from "./types.js";
export declare class OpenAIClient implements ChatBot {
    private client;
    private options;
    private fullModelName;
    private model;
    constructor(modelName: string, options: Options);
    getFullModelName(): string;
    create(ctx: PullRequestContext, prompts: Message[]): Promise<string>;
}
