import type { GroupConfig, GroupConfigStore } from "../types";

const store = new Map<number, GroupConfig>();

// Default configuration values (can be moved to a config file)
const DEFAULT_PRIMARY_LANG = "en";
const DEFAULT_SECONDARY_LANG = "vi";
const DEFAULT_ENABLED = true;
const DEFAULT_TRANSLATE_COMMANDS = false;
const DEFAULT_REPLY_STYLE = "reply" as const;

export const memoryStore: GroupConfigStore = {
	async get(chatId: number): Promise<GroupConfig> {
		const config = store.get(chatId);
		if (config) {
			return config;
		}
		// Return default config if not found
		return this.getDefaultConfig(chatId);
	},

	async set(chatId: number, config: GroupConfig): Promise<void> {
		store.set(chatId, config);
	},

	async delete(chatId: number): Promise<void> {
		store.delete(chatId);
	},

	getDefaultConfig(chatId: number): GroupConfig {
		return {
			chatId,
			languagePair: {
				primary: DEFAULT_PRIMARY_LANG,
				secondary: DEFAULT_SECONDARY_LANG,
			},
			enabled: DEFAULT_ENABLED,
			translateCommands: DEFAULT_TRANSLATE_COMMANDS,
			replyStyle: DEFAULT_REPLY_STYLE,
		};
	},
};
