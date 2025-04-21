import { FileAdapter } from "@grammyjs/storage-file";
import { type Context, type SessionFlavor, session } from "grammy";
import type { GroupConfig } from "../types";

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

// Define session data type
interface SessionData {
	config: GroupConfig;
}

// Extend context to include session data
export type SessionContext = Context & SessionFlavor<SessionData>;

// Create file adapter for persistent storage
const fileAdapter = new FileAdapter({
	dirName: "data/sessions",
	filename: (key: string) => `session_${key}.json`,
});

// Create session middleware
export const sessionMiddleware = session({
	initial: (ctx: Context): SessionData => ({
		config: {
			chatId: ctx.chat?.id || 0,
			...DEFAULT_CONFIG,
		},
	}),
	storage: fileAdapter,
});

// Helper functions to work with session data
export const sessionStore = {
	async get(ctx: SessionContext): Promise<GroupConfig> {
		return ctx.session.config;
	},

	async set(ctx: SessionContext, config: GroupConfig): Promise<void> {
		ctx.session.config = config;
	},

	async delete(ctx: SessionContext): Promise<void> {
		// Reset to default config
		ctx.session.config = {
			chatId: ctx.chat?.id || 0,
			...DEFAULT_CONFIG,
		};
	},
};
