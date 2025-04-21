module.exports = {
	apps: [
		{
			name: "trans-bot-ai",
			script: "./packages/ai/.mastra/output/index.mjs",
			env: {
				NODE_ENV: "production",
				OPENAI_API_KEY: process.env.OPENAI_API_KEY,
			},
		},
		{
			name: "trans-bot-telegram",
			script: "./packages/telegram/src/index.ts",
			interpreter: "bun",
			env: {
				NODE_ENV: "production",
				TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
				MASTRA_API_URL: "http://localhost:4111",
			},
		},
	],
};
