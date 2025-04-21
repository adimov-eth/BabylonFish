import { Bot } from "grammy";
import "dotenv/config";

interface Message {
	role: "user" | "assistant" | "system";
	content: string;
}

interface AgentResponse {
	text: string;
	toolCalls?: unknown[];
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MASTRA_API_URL = process.env.MASTRA_API_URL || "http://localhost:4111";
const AGENT_ID = "telegramAssistant";

if (!BOT_TOKEN) {
	throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const bot = new Bot(BOT_TOKEN);

async function callAgent(message: string): Promise<AgentResponse | null> {
	try {
		const response = await fetch(
			`${MASTRA_API_URL}/api/agents/${AGENT_ID}/generate`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [{ role: "user", content: message }],
				}),
			},
		);

		if (!response.ok) return null;
		return response.json();
	} catch (error) {
		console.error("Agent API error:", error);
		return null;
	}
}

bot.on("message:text", async (ctx) => {
	await ctx.replyWithChatAction("typing");

	const response = await callAgent(ctx.message.text);

	if (response?.text) {
		await ctx.reply(response.text);
	} else {
		await ctx.reply("Sorry, I'm having trouble processing your request.");
	}
});

bot.command("start", (ctx) =>
	ctx.reply("Hello! I'm your AI assistant. How can I help?"),
);

bot.catch((err) => {
	console.error("Bot error:", err);
});

// Start bot
bot.start();
