import { Bot, type Middleware, type NextFunction } from "grammy";
import "dotenv/config";
// Import AI function directly
import { translateText } from "@ai/mastra/agents/assistant";
import type { TranslationRequest, TranslationResponse } from "@ai/mastra/types";
import {
	type SessionContext,
	ensureConfig,
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
			{ command: "help", description: "Show available commands and usage" },
		],
		{ scope: { type: "all_group_chats" } },
	);

	console.log("Bot commands registered with Telegram.");
}

// Middleware to load group config
bot.use(async (ctx: SessionContext, next: NextFunction) => {
	if (ctx.chat) {
		if (ctx.chat.type !== "private") {
			// Only load group config for non-private chats
			ctx.session.config = await ctx.session.configStore.get(ctx.chat.id);
		}
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
			const config = await ctx.session.configStore.get(ctx.chat.id);
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
		await ctx.session.configStore.set(ctx.chat.id, config);
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

	const config = ctx.session.config;
	const configString = `
Group Configuration:
- Enabled: ${config?.enabled}
- Languages: ${config?.languagePair.primary} ↔ ${config?.languagePair.secondary}
- Reply Style: ${config?.replyStyle}
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
	await ctx.session.configStore.set(ctx.chat?.id ?? 0, config);
	await ctx.reply("Translation enabled.");
});

bot.command("disable", async (ctx: SessionContext) => {
	if (ctx.chat?.type === "private") {
		return ctx.reply("Command only available in groups.");
	}
	// TODO: Add admin check
	if (!ctx.session.config?.enabled) {
		return ctx.reply("Translation is already disabled.");
	}

	ctx.session.config = {
		...ctx.session.config,
		enabled: false,
	};
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
	await ctx.session.configStore.set(ctx.chat?.id ?? 0, config);
	await ctx.reply(`Reply style set to: ${style}`);
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
