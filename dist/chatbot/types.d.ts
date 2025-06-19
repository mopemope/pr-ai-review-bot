import type { PullRequestContext } from "../context.js";
/**
 * Type providing a message structure for the chatbot.
 */
export interface Message {
    text: string;
    role: string;
    cache?: boolean;
}
/**
 * Interface for chatbot clients that can review code
 */
export interface ChatBot {
    /**
     * returns the full model name
     */
    getFullModelName(): string;
    /**
     * generate message for the given context
     * @returns llm response
     */
    create(ctx: PullRequestContext, prompts: Message[]): Promise<string>;
}
/**
 * Extract the model name from a full model identifier string
 * @param name - Full model identifier in "provider/model" format
 * @returns The model portion of the identifier, or the original string if no provider prefix is found.
 */
export declare function getModelName(modelName: string): string;
