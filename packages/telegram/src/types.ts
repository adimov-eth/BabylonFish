export interface GroupConfig {
	chatId: number;
	languagePair: {
		primary: string; // ISO 639-1 code (e.g., 'en', 'vi', 'es')
		secondary: string; // ISO 639-1 code
	};
	enabled: boolean;
	translateCommands: boolean;
	replyStyle: "thread" | "reply" | "inline";
}

export interface GroupConfigStore {
	get(chatId: number): Promise<GroupConfig>;
	set(chatId: number, config: GroupConfig): Promise<void>;
	delete(chatId: number): Promise<void>;
	getDefaultConfig(chatId: number): GroupConfig;
}
