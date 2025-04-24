import type { GroupConfigStore } from "../types";
import { fileStore } from "./fileStore";
import { memoryStore } from "./memoryStore";
import { redisStore } from "./redisStore";

export type StoreType = "memory" | "file" | "redis";

export function createStore(type: StoreType = "redis"): GroupConfigStore {
	switch (type) {
		case "memory":
			return memoryStore;
		case "file":
			return fileStore;
		case "redis":
			return redisStore;
		default:
			throw new Error(`Unknown store type: ${type}`);
	}
}

// Export individual stores for direct usage if needed
export { memoryStore, fileStore, redisStore };
