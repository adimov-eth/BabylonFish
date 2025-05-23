import { Bot, InputFile, type Middleware, type NextFunction } from "grammy";
import "dotenv/config";
import { Readable } from "node:stream";
// Import AI function directly
import {
	textToSpeech,
	transcribeVoice,
	translateText,
} from "@ai/mastra/agents/assistant";
import type { TranslationRequest, TranslationResponse } from "@ai/mastra/types";
import {
	type SessionContext,
	ensureConfig,
	getStore,
	sessionMiddleware,
} from "./store/sessionStore";
import type { GroupConfig } from "./types";

interface Message {
	role: "user" | "assistant" | "system";
	content: string;
}

interface AgentResponse {
	text: string;
	toolCalls?: unknown[];
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Remove MASTRA_API_URL and TRANSLATION_ENDPOINT if no longer needed for other calls
// const MASTRA_API_URL = process.env.MASTRA_API_URL || "http://localhost:4111";
// const TRANSLATION_ENDPOINT = `${MASTRA_API_URL}/api/translate`; // Placeholder

if (!BOT_TOKEN) {
	throw new Error("TELEGRAM_BOT_TOKEN is required");
}

// Create bot instance with session context
const bot = new Bot<SessionContext>(BOT_TOKEN);

// Register session middleware
bot.use(sessionMiddleware);

// Register commands for Telegram suggestion list
async function setupCommands(botInstance: Bot<SessionContext>) {
	// Register commands for both private chats and group chats
	await botInstance.api.setMyCommands(
		[
			{ command: "start", description: "Start the bot / Show initial info" },
			{
				command: "setlanguages",
				description: "Set primary/secondary langs (e.g., en vi)",
			},
			{ command: "showconfig", description: "Show current group config" },
			{ command: "enable", description: "Enable translation in this group" },
			{ command: "disable", description: "Disable translation in this group" },
			{
				command: "setstyle",
				description: "Set reply style (reply, thread, inline)",
			},
			{
				command: "togglereplyvoice",
				description: "Toggle replying with translated voice message",
			},
			{ command: "help", description: "Show available commands and usage" },
		],
		{ scope: { type: "all_private_chats" } },
	);

	// Also set commands specifically for group chats
	await botInstance.api.setMyCommands(
		[
			{ command: "start", description: "Start the bot / Show initial info" },
			{
				command: "setlanguages",
				description: "Set primary/secondary langs (e.g., en vi)",
			},
			{ command: "showconfig", description: "Show current group config" },
			{ command: "enable", description: "Enable translation in this group" },
			{ command: "disable", description: "Disable translation in this group" },
			{
				command: "setstyle",
				description: "Set reply style (reply, thread, inline)",
			},
			{
				command: "togglereplyvoice",
				description: "Toggle replying with translated voice message",
			},
			{ command: "help", description: "Show available commands and usage" },
		],
		{ scope: { type: "all_group_chats" } },
	);

	console.log("Bot commands registered with Telegram.");
}

// Middleware to load group config
bot.use(async (ctx: SessionContext, next: NextFunction) => {
	try {
		if (!ctx.chat) {
			console.log("No chat context, skipping config load");
			return next();
		}

		if (ctx.chat.type === "private") {
			console.log("Private chat, skipping config load");
			return next();
		}

		// Only load group config for non-private chats
		if (!ctx.session) {
			console.error("Session not initialized for chat:", ctx.chat.id);
			return next();
		}

		console.log("Session state for chat", ctx.chat.id, ":", {
			hasConfig: !!ctx.session.config,
		});

		try {
			console.log("Loading config for chat:", ctx.chat.id);
			// Use getStore() directly
			ctx.session.config = await getStore().get(ctx.chat.id);
			console.log(
				"Loaded config for chat",
				ctx.chat.id,
				":",
				ctx.session.config,
			);
		} catch (configError) {
			console.error(
				"Error loading config for chat",
				ctx.chat.id,
				":",
				configError,
			);
			// Don't throw, let the bot continue without config
		}
	} catch (error) {
		console.error("Error in group config middleware:", error);
		// Log the full context state in case of error
		console.error("Context state:", {
			hasChat: !!ctx.chat,
			chatType: ctx.chat?.type,
			chatId: ctx.chat?.id,
			hasSession: !!ctx.session,
			hasConfig: ctx.session?.config !== undefined,
		});
	}
	await next();
});

// Add logging middleware for debugging
bot.use(async (ctx: SessionContext, next: NextFunction) => {
	// Log incoming updates for debugging
	if (ctx.update && ctx.message?.text?.startsWith("/")) {
		console.log(
			"Received command:",
			ctx.message.text,
			"in chat:",
			ctx.chat?.id,
		);
		console.log("Message full context:", JSON.stringify(ctx.message, null, 2));
	}
	await next();
});

// Command handlers with improved error handling - MUST BE BEFORE message:text handler
bot.command("help", async (ctx: SessionContext) => {
	try {
		console.log("Processing /help command");
		const helpText = `
Available commands:
/start - Start the bot / Show initial info
/setlanguages <primary> <secondary> - Set languages (e.g., /setlanguages en vi)
/showconfig - Show current group config
/enable - Enable translation in this group
/disable - Disable translation in this group
/setstyle <style> - Set reply style (reply, thread, inline)
/togglereplyvoice - Toggle replying with translated voice message
/help - Show this help message
`;
		await ctx.reply(helpText);
	} catch (error) {
		console.error("Error in /help command:", error);
		await ctx.reply(
			"Sorry, there was an error processing your command. Please try again.",
		);
	}
});

// Move all other command handlers here, BEFORE the message:text handler
bot.command("start", async (ctx: SessionContext) => {
	try {
		console.log("Processing /start command");
		if (ctx.chat?.type === "private") {
			await ctx.reply(
				"Welcome! I am a translation bot. Add me to a group to help translate messages between languages.",
			);
		} else if (ctx.chat) {
			const config = await getStore().get(ctx.chat.id);
			const langPair = `${config.languagePair.primary} ↔ ${config.languagePair.secondary}`;
			await ctx.reply(
				`Translation Bot Activated! Current language pair: ${langPair}\nUse /showconfig to see current settings.`,
			);
		}
	} catch (error) {
		console.error("Error in /start command:", error);
		await ctx.reply(
			"Sorry, there was an error processing your command. Please try again.",
		);
	}
});

bot.command("setlanguages", async (ctx: SessionContext) => {
	try {
		console.log("Processing /setlanguages command");
		if (ctx.chat?.type === "private") {
			return ctx.reply("Command only available in groups.");
		}

		const args = (
			typeof ctx.match === "string" ? ctx.match : (ctx.match?.[0] ?? "")
		)
			.split(" ")
			.filter(Boolean);
		if (args.length !== 2) {
			return ctx.reply(
				"Usage: /setlanguages <primary_lang_code> <secondary_lang_code>\nExample: /setlanguages en vi",
			);
		}

		const [primary, secondary] = args;
		if (!ctx.chat) return;
		const config = ensureConfig(ctx);
		config.languagePair = { primary, secondary };
		await getStore().set(ctx.chat.id, config);
		await ctx.reply(`Languages set to: ${primary} ↔ ${secondary}`);
	} catch (error) {
		console.error("Error in /setlanguages command:", error);
		await ctx.reply(
			"Sorry, there was an error processing your command. Please try again.",
		);
	}
});

bot.command("showconfig", async (ctx: SessionContext) => {
	if (ctx.chat?.type === "private") {
		return ctx.reply("Command only available in groups.");
	}

	// Ensure config is loaded, handle potential null if middleware failed
	const config =
		ctx.session.config ?? (await getStore().get(ctx.chat?.id ?? 0));

	const configString = `
Group Configuration:
- Enabled: ${config?.enabled}
- Languages: ${config?.languagePair.primary} ↔ ${config?.languagePair.secondary}
- Reply Style: ${config?.replyStyle}
- Reply With Voice: ${config?.replyWithVoice}
- Translate Commands: ${config?.translateCommands}
  `;
	await ctx.reply(configString);
});

// TODO: Implement /enable, /disable, /setstyle commands
bot.command("enable", async (ctx: SessionContext) => {
	if (ctx.chat?.type === "private") {
		return ctx.reply("Command only available in groups.");
	}
	// TODO: Add admin check
	if (ctx.session.config?.enabled) {
		return ctx.reply("Translation is already enabled.");
	}

	const config = ensureConfig(ctx);
	config.enabled = true;
	await getStore().set(ctx.chat?.id ?? 0, config);
	await ctx.reply("Translation enabled.");
});

bot.command("disable", async (ctx: SessionContext) => {
	if (ctx.chat?.type === "private") {
		return ctx.reply("Command only available in groups.");
	}
	// TODO: Add admin check
	const config = ensureConfig(ctx);
	if (!config.enabled) {
		return ctx.reply("Translation is already disabled.");
	}

	config.enabled = false;
	await getStore().set(ctx.chat?.id ?? 0, config);
	await ctx.reply("Translation disabled.");
});

bot.command("setstyle", async (ctx: SessionContext) => {
	if (ctx.chat?.type === "private") {
		return ctx.reply("Command only available in groups.");
	}
	// TODO: Add admin check

	const style = (
		typeof ctx.match === "string" ? ctx.match : (ctx.match?.[0] ?? "")
	)
		.trim()
		.toLowerCase();
	if (style !== "thread" && style !== "reply" && style !== "inline") {
		return ctx.reply("Invalid style. Use 'thread', 'reply', or 'inline'.");
	}

	const config = ensureConfig(ctx);
	config.replyStyle = style as "thread" | "reply" | "inline";
	await getStore().set(ctx.chat?.id ?? 0, config);
	await ctx.reply(`Reply style set to: ${style}`);
});

bot.command("togglereplyvoice", async (ctx: SessionContext) => {
	if (ctx.chat?.type === "private") {
		return ctx.reply("Command only available in groups.");
	}
	// TODO: Add admin check

	const config = ensureConfig(ctx);
	config.replyWithVoice = !config.replyWithVoice; // Toggle the value
	await getStore().set(ctx.chat?.id ?? 0, config);
	await ctx.reply(
		`Reply with voice is now ${config.replyWithVoice ? "ENABLED" : "DISABLED"}.`,
	);
});

// Regular message handler - MUST BE AFTER all command handlers
bot.on("message:text", async (ctx: SessionContext) => {
	if (!ctx.session.config?.enabled) {
		console.log("Message ignored - translation disabled");
		return;
	}

	// Ignore all commands
	if (ctx.message?.text?.startsWith("/")) {
		console.log("Ignoring command in message handler:", ctx.message.text);
		return;
	}

	// Basic language detection placeholder (TODO: Improve detection)
	const text = ctx.message?.text ?? "";
	const { primary, secondary } = ctx.session.config.languagePair;
	let sourceLang = primary;
	let targetLang = secondary;

	// Very basic check, assumes message is in secondary lang if it contains non-ASCII
	// TODO: Replace with actual language detection from AI service
	// Check if the text contains any non-ASCII characters
	let containsNonAscii = false;
	for (let i = 0; i < text.length; i++) {
		if (text.charCodeAt(i) > 127) {
			containsNonAscii = true;
			break;
		}
	}
	if (containsNonAscii) {
		sourceLang = secondary;
		targetLang = primary;
	}

	// Avoid translating messages already in the target language
	// (Requires better detection)
	// if (detectedLang === targetLang) return;

	// Ignore commands unless configured
	if (text.startsWith("/") && !ctx.session.config.translateCommands) return;

	await ctx.replyWithChatAction("typing");

	const translationRequest: TranslationRequest = {
		text,
		sourceLanguage: sourceLang,
		targetLanguage: targetLang,
		groupId: ctx.chat?.id ?? 0,
	};

	// Call the imported function directly
	const response = await translateText(translationRequest);

	if (response?.translatedText && response.confidence > 0) {
		// Check confidence
		// Determine reply method based on config
		const username = ctx.message?.from?.username || "User"; // Fallback if username is missing
		const replyText = `@${username}: ${response.translatedText}`;

		if (ctx.session.config.replyStyle === "thread") {
			// TODO: Implement threading if API supports it directly or manage via message ID
			await ctx.reply(replyText); // Removed replyOptions
		} else if (ctx.session.config.replyStyle === "inline") {
			// TODO: Inline requires different bot setup (Inline Mode)
			await ctx.reply(replyText); // Fallback to reply, removed replyOptions
		} else {
			// Default to reply
			await ctx.reply(replyText); // Removed replyOptions
		}
	} else {
		// Optional: Notify user about translation failure or low confidence
		console.log(
			"Translation failed or confidence too low for message:",
			ctx.message?.message_id,
			"Response:",
			response,
		);
		// await ctx.reply("Sorry, couldn't translate that.", replyOptions);
	}
});

// Voice message handler
bot.on("message:voice", async (ctx: SessionContext) => {
	const chatId = ctx.chat?.id;
	if (!chatId) {
		console.log("Ignoring voice message - no chat ID");
		return;
	}

	const config = ensureConfig(ctx);
	if (!config?.enabled) {
		console.log(
			`Voice message ignored in chat ${chatId} - translation disabled`,
		);
		return;
	}

	if (!ctx.message?.voice) {
		console.log(`Ignoring non-voice message update in chat ${chatId}`);
		return;
	}

	console.log(
		`Processing voice message ${ctx.message.message_id} in chat ${chatId}`,
	);
	try {
		const voice = ctx.message.voice;
		const file = await ctx.getFile(); // Get file metadata
		const filePath = file.file_path;

		if (!filePath) {
			throw new Error("Could not get voice message file path.");
		}

		// Construct download URL
		const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

		console.log(`Downloading voice file from: ${fileUrl}`);
		await ctx.replyWithChatAction("typing");

		// Fetch the audio file as a stream
		const response = await fetch(fileUrl);
		if (!response.ok || !response.body) {
			throw new Error(`Failed to download voice file: ${response.statusText}`);
		}

		// Node.js stream Readable compatibility - fetch response.body is ReadableStream
		// We need Node's Readable for the AI function
		// Convert Web Stream to Node Stream
		const nodeReadableStream = Readable.fromWeb(
			response.body as import("stream/web").ReadableStream<Uint8Array>,
		);

		// Transcribe the voice message
		const transcription = await transcribeVoice(nodeReadableStream);
		console.log(
			`Transcription for message ${ctx.message.message_id}: ${transcription}`,
		);

		// Determine source and target languages based on transcription content
		const { primary, secondary } = config.languagePair;
		let sourceLang = primary;
		let targetLang = secondary;

		// Use the same basic detection as text messages
		let containsNonAscii = false;
		for (let i = 0; i < transcription.length; i++) {
			if (transcription.charCodeAt(i) > 127) {
				containsNonAscii = true;
				break;
			}
		}
		if (containsNonAscii) {
			sourceLang = secondary;
			targetLang = primary;
		}

		console.log(
			`Detected voice language direction: ${sourceLang} -> ${targetLang}`,
		);

		// Translate the transcription
		const translationRequest: TranslationRequest = {
			text: transcription,
			sourceLanguage: sourceLang,
			targetLanguage: targetLang,
			groupId: chatId,
		};

		const translationResponse = await translateText(translationRequest);

		// Send the translated text
		if (
			translationResponse?.translatedText &&
			translationResponse.confidence > 0
		) {
			const username = ctx.message?.from?.username || "User";
			const replyText = `@${username} (🎤→${targetLang}): ${translationResponse.translatedText}`;

			// Use configured reply style (ignoring inline for now)
			const replyOptions = {
				reply_to_message_id: ctx.message.message_id,
				// message_thread_id: config.replyStyle === 'thread' ? ctx.message.message_thread_id : undefined
				// TODO: Add thread support when available/stable
			};
			await ctx.reply(replyText, replyOptions);

			// Reply with voice if enabled
			if (config.replyWithVoice) {
				console.log(
					`Generating voice reply for message ${ctx.message.message_id}`,
				);
				await ctx.replyWithChatAction("record_voice");
				try {
					const translatedAudioStream = await textToSpeech(
						translationResponse.translatedText,
					);
					// Use InputFile to send the stream
					await ctx.replyWithVoice(
						new InputFile(
							translatedAudioStream,
							`translation-${Date.now()}.ogg`,
						),
						replyOptions,
					);
				} catch (ttsError) {
					console.error("Failed to generate or send voice reply:", ttsError);
					await ctx.reply("[Failed to generate voice reply]", replyOptions);
				}
			}
		} else {
			console.log(
				`Translation failed or confidence too low for voice message ${ctx.message.message_id}`,
			);
			await ctx.reply("[Translation failed or confidence too low]", {
				reply_to_message_id: ctx.message.message_id,
			});
		}
	} catch (error) {
		console.error(
			`Error processing voice message ${ctx.message?.message_id} in chat ${chatId}:`,
			error,
		);
		await ctx.reply("Sorry, I couldn't process that voice message.", {
			reply_to_message_id: ctx.message?.message_id,
		});
	}
});

bot.catch((err: Error) => {
	console.error("Bot error:", err);
});

// Start bot
async function startBot() {
	try {
		await setupCommands(bot);

		// Register all command handlers before starting the bot
		bot.start({
			onStart: (botInfo: { username: string }) =>
				console.log(`Bot started as ${botInfo.username}`),
		});
		console.log("Bot is running...");
	} catch (error) {
		console.error("Error during bot startup:", error);
	}
}

startBot().catch((err: Error) => {
	console.error("Failed to start bot:", err);
});

// console.log("Bot is running..."); // Removed original console log
