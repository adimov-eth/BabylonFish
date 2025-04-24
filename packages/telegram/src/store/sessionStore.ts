import { RedisAdapter } from "@grammyjs/storage-redis";
import { type Context, type SessionFlavor, session } from "grammy";
import { Redis } from "ioredis";
import type { GroupConfig, GroupConfigStore } from "../types";
import { createStore } from "./index";

// Default configuration values
const DEFAULT_CONFIG: Omit<GroupConfig, "chatId"> = {
	languagePair: {
		primary: "en",
		secondary: "vi",
	},
	enabled: true,
	translateCommands: false,
	replyStyle: "reply" as const,
	replyWithVoice: false,
};

// Define session data type
export interface SessionData {
	language?: string;
	config: GroupConfig | null;
	// configStore: GroupConfigStore; // Removed - Cannot serialize functions
}

// Export session context type
export type SessionContext = Context & SessionFlavor<SessionData>;

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Create Redis adapter for session storage
const redisAdapter = new RedisAdapter<SessionData>({
	instance: redis,
	ttl: 24 * 60 * 60, // 24 hours TTL
});

// Get session key from context
const getSessionKey = (ctx: Context): string | undefined => {
	// Return undefined for non-message updates
	if (!ctx.chat?.id) {
		return undefined;
	}
	return `session:${ctx.chat.id.toString()}`;
};

// Lazy store initialization - Export getStore to be used directly
let store: GroupConfigStore | null = null;
export const getStore = (): GroupConfigStore => {
	if (!store) {
		console.log("Initializing Redis store...");
		try {
			store = createStore("redis");
			console.log("Redis store initialized successfully");
		} catch (error) {
			console.error("Failed to initialize Redis store:", error);
			throw error;
		}
	}
	return store;
};

// Initial session data
const initialSession = (): SessionData => {
	console.log("Initializing new session...");
	try {
		// const configStore = getStore(); // Removed - store is not part of session
		console.log("Session initialized"); // Simplified log
		return {
			language: "en",
			config: null,
			// configStore, // Removed - This caused the error on line 72 in previous lint
		};
	} catch (error) {
		console.error("Error initializing session:", error);
		throw error;
	}
};

// Export session middleware
export const sessionMiddleware = session({
	initial: initialSession,
	storage: redisAdapter,
	getSessionKey,
});

// Helper functions for managing session data
export const getSession = async (
	key: string,
): Promise<SessionData | undefined> => {
	const data = await redisAdapter.read(key);
	// if (data && !data.configStore) { // Removed check - configStore is not in session - Error line 92
	// 	console.log("Fixing missing configStore in session", key);
	// 	data.configStore = getStore(); // Removed - Error line 94
	// }
	return data;
};

export const setSession = async (
	key: string,
	data: SessionData,
): Promise<void> => {
	// Ensure configStore is set // Removed check - configStore is not in session - Error line 104
	// if (!data.configStore) {
	// 	console.log("Setting missing configStore in session", key);
	// 	data.configStore = getStore(); // Removed - Error line 106
	// }
	await redisAdapter.write(key, data);
};

export const deleteSession = async (key: string): Promise<void> => {
	await redisAdapter.delete(key);
};

// Reset session to default configuration
export const resetSession = async (key: string): Promise<void> => {
	await setSession(key, initialSession());
};

// Helper function to ensure config exists and is not null
export const ensureConfig = (ctx: SessionContext): GroupConfig => {
	// Ensure configStore exists // Removed check - configStore is not in session - Error line 123
	// if (!ctx.session.configStore) {
	// 	console.log("Fixing missing configStore in session");
	// 	ctx.session.configStore = getStore(); // Removed - Error line 125
	// }

	if (!ctx.session.config) {
		// Initialize default config if none exists
		// Use getStore() directly
		ctx.session.config = getStore().getDefaultConfig(ctx.chat?.id ?? 0); // Error line 130 was here
	}
	// The above ensures ctx.session.config is not null, addressing error line 134
	return ctx.session.config;
};

// Helper functions to work with session data
export const sessionStore = {
	async get(ctx: SessionContext): Promise<GroupConfig> {
		const chatId =
			ctx.chat?.id ??
			ctx.callbackQuery?.message?.chat.id ??
			ctx.channelPost?.chat.id ??
			ctx.myChatMember?.chat.id;

		// Ensure configStore exists // Removed check - configStore is not in session - Error line 147
		// if (!ctx.session.configStore) {
		// 	console.log("Fixing missing configStore in sessionStore.get");
		// 	ctx.session.configStore = getStore();
		// }

		const config = ensureConfig(ctx); // ensureConfig now uses getStore() if needed
		if (chatId) {
			config.chatId = chatId;
		}
		return config;
	},

	async set(ctx: SessionContext, config: GroupConfig): Promise<void> {
		// Ensure configStore exists // Removed check - configStore is not in session
		// if (!ctx.session.configStore) {
		// 	console.log("Fixing missing configStore in sessionStore.set");
		// 	ctx.session.configStore = getStore();
		// }
		ctx.session.config = config; // Only update the config part of the session
	},

	async delete(ctx: SessionContext): Promise<void> {
		// Reset to default config
		const chatId =
			ctx.chat?.id ??
			ctx.callbackQuery?.message?.chat.id ??
			ctx.channelPost?.chat.id ??
			ctx.myChatMember?.chat.id;
		ctx.session.config = {
			chatId: chatId ?? 0,
			...DEFAULT_CONFIG,
		};
	},
};
