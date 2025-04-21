import { FileAdapter } from "@grammyjs/storage-file";
import type { GroupConfig } from "../types";
import type { GroupConfigStore } from "../types";

// Default configuration values
const DEFAULT_CONFIG: Omit<GroupConfig, "chatId"> = {
	languagePair: {
		primary: "en",
		secondary: "vi",
	},
	enabled: true,
	translateCommands: false,
	replyStyle: "reply" as const,
};

// File adapter configuration
const FILE_STORE_CONFIG = {
	dirName: process.env.FILE_STORE_DIR || "data/sessions",
	formatKey: (key: string) => `group_${key}.json`,
};

// Create file adapter instance
const fileAdapter = new FileAdapter<GroupConfig>(FILE_STORE_CONFIG);

export const fileStore: GroupConfigStore = {
	async get(chatId: number): Promise<GroupConfig> {
		try {
			const data = await fileAdapter.read(chatId.toString());
			if (!data) {
				return this.getDefaultConfig(chatId);
			}
			return { ...data, chatId } as GroupConfig;
		} catch (error) {
			console.error(`Error reading config for chat ${chatId}:`, error);
			return this.getDefaultConfig(chatId);
		}
	},

	async set(chatId: number, config: GroupConfig): Promise<void> {
		if (!config || typeof config !== "object") {
			throw new Error("Invalid config object provided");
		}

		try {
			await fileAdapter.write(chatId.toString(), config);
		} catch (error) {
			console.error(`Error writing config for chat ${chatId}:`, error);
			throw new Error(`Failed to save config for chat ${chatId}`);
		}
	},

	async delete(chatId: number): Promise<void> {
		try {
			await fileAdapter.delete(chatId.toString());
		} catch (error) {
			console.error(`Error deleting config for chat ${chatId}:`, error);
			throw new Error(`Failed to delete config for chat ${chatId}`);
		}
	},

	getDefaultConfig(chatId: number): GroupConfig {
		return {
			chatId,
			...DEFAULT_CONFIG,
		};
	},
};
