import { Redis } from "ioredis";
import type { GroupConfig, GroupConfigStore } from "../types";

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Helper to ensure keys are prefixed for namespace isolation
const getKey = (groupId: number) => `telegram:group:${groupId}`;

const getDefaultConfig = (chatId: number): GroupConfig => ({
	chatId,
	enabled: false,
	languagePair: {
		primary: "en",
		secondary: "vi",
	},
	translateCommands: false,
	replyStyle: "reply",
});

export const redisStore: GroupConfigStore = {
	getDefaultConfig,

	async get(groupId: number) {
		try {
			const data = await redis.get(getKey(groupId));
			if (!data) {
				return getDefaultConfig(groupId);
			}
			return JSON.parse(data) as GroupConfig;
		} catch (error) {
			console.error(`Redis get error for group ${groupId}:`, error);
			throw error;
		}
	},

	async set(groupId: number, config: GroupConfig) {
		try {
			await redis.set(getKey(groupId), JSON.stringify(config));
		} catch (error) {
			console.error(`Redis set error for group ${groupId}:`, error);
			throw error;
		}
	},

	async delete(groupId: number) {
		try {
			await redis.del(getKey(groupId));
		} catch (error) {
			console.error(`Redis delete error for group ${groupId}:`, error);
			throw error;
		}
	},
};
