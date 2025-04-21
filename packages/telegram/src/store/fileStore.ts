import { FileAdapter } from "@grammyjs/storage-file";
import type { GroupConfig, GroupConfigStore } from "../types";

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

// Create file adapter instance
const fileAdapter = new FileAdapter({
	dirName: "data/sessions", // Directory where files will be stored
	// Format the filename to be chat ID based
	filename: (key: string) => `group_${key}.json`,
});

export const fileStore: GroupConfigStore = {
	async get(chatId: number): Promise<GroupConfig> {
		try {
			const data = await fileAdapter.read(chatId.toString());
			if (data) {
				return { ...data, chatId } as GroupConfig;
			}
		} catch (error) {
			console.error(`Error reading config for chat ${chatId}:`, error);
		}

		// Return default config if not found or error
		return {
			chatId,
			...DEFAULT_CONFIG,
		};
	},

	async set(chatId: number, config: GroupConfig): Promise<void> {
		try {
			await fileAdapter.write(chatId.toString(), config);
		} catch (error) {
			console.error(`Error writing config for chat ${chatId}:`, error);
			throw error; // Re-throw to handle in caller
		}
	},

	async delete(chatId: number): Promise<void> {
		try {
			await fileAdapter.delete(chatId.toString());
		} catch (error) {
			console.error(`Error deleting config for chat ${chatId}:`, error);
			throw error; // Re-throw to handle in caller
		}
	},
};
