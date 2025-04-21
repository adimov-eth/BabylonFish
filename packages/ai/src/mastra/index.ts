import type { Mastra as MastraType } from "@mastra/core";
import { Mastra } from "@mastra/core";
import { assistantAgent } from "./agents/assistant";

export const mastra: MastraType = new Mastra({
	agents: {
		telegramAssistant: assistantAgent,
	},
});
