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
};

// Define session data type
export interface SessionData {
	language?: string;
	config: GroupConfig | null;
	configStore: GroupConfigStore;
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

// Initial session data
const initialSession = (): SessionData => ({
	language: "en",
	config: null,
	configStore: createStore("redis"),
});

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
	return data as SessionData | undefined;
};

export const setSession = async (
	key: string,
	data: SessionData,
): Promise<void> => {
	await redisAdapter.write(key, data);
};

export const deleteSession = async (key: string): Promise<void> => {
	await redisAdapter.delete(key);
};

// Reset session to default configuration
export const resetSession = async (key: string): Promise<void> => {
	await setSession(key, initialSession());
};

// Helper function to ensure config exists
export const ensureConfig = (ctx: SessionContext): GroupConfig => {
	if (!ctx.session.config) {
		// Initialize default config if none exists
		ctx.session.config = ctx.session.configStore.getDefaultConfig(
			ctx.chat?.id ?? 0,
		);
	}
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
		const config = ensureConfig(ctx);
		if (chatId) {
			config.chatId = chatId;
		}
		return config;
	},

	async set(ctx: SessionContext, config: GroupConfig): Promise<void> {
		ctx.session.config = config;
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
