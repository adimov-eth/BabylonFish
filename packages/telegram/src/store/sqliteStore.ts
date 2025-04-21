import { SqliteAdapter } from "@grammyjs/storage-sqlite";
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

// Create SQLite adapter instance
const sqliteAdapter = new SqliteAdapter({
	filename: "data/bot.db", // Path to SQLite database file
	table: "sessions", // Table name for storing sessions
});

// Initialize the database table
sqliteAdapter.init().catch(console.error);

export const sqliteStore: GroupConfigStore = {
	async get(chatId: number): Promise<GroupConfig> {
		try {
			const data = await sqliteAdapter.read(chatId.toString());
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
			await sqliteAdapter.write(chatId.toString(), config);
		} catch (error) {
			console.error(`Error writing config for chat ${chatId}:`, error);
			throw error; // Re-throw to handle in caller
		}
	},

	async delete(chatId: number): Promise<void> {
		try {
			await sqliteAdapter.delete(chatId.toString());
		} catch (error) {
			console.error(`Error deleting config for chat ${chatId}:`, error);
			throw error; // Re-throw to handle in caller
		}
	},
};
