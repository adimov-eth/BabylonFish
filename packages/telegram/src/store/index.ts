import type { GroupConfigStore } from "../types";
import { fileStore } from "./fileStore";
import { memoryStore } from "./memoryStore";
import { sqliteStore } from "./sqliteStore";

export type StoreType = "memory" | "file" | "sqlite";

export function createStore(type: StoreType = "sqlite"): GroupConfigStore {
	switch (type) {
		case "memory":
			return memoryStore;
		case "file":
			return fileStore;
		case "sqlite":
			return sqliteStore;
		default:
			throw new Error(`Unknown store type: ${type}`);
	}
}

// Export individual stores for direct usage if needed
export { memoryStore, fileStore, sqliteStore };
