import { Agent } from "@mastra/core";
import { openai } from "@mastra/core/llm";

export const assistantAgent = new Agent({
	name: "Telegram Assistant",
	instructions:
		"You are a helpful Telegram bot assistant. Be concise and friendly.",
	model: openai("gpt-4-turbo-preview"),
});
