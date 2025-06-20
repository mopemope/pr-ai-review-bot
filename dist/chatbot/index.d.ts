import type { Options } from "../option.js";
import type { ChatBot } from "./types.js";
export type { ChatBot, Message } from "./types.js";
export { getModelName } from "./types.js";
/**
 * Factory function to create appropriate ChatBot implementation based on model name
 * @param modelName - Name of the model to use (prefixed with provider name)
 * @param options - Configuration options
 * @returns ChatBot implementation for the specified model
 * @throws Error if the model is not supported
 */
export declare const createChatBotFromModel: (modelName: string, options: Options) => ChatBot;
