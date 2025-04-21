module.exports = {
	apps: [
		{
			name: "trans-bot-ai",
			script: "./packages/ai/.mastra/output/index.mjs",
			env: {
				NODE_ENV: "production",
			},
		},
		{
			name: "trans-bot-telegram",
			script: "./packages/telegram/src/index.ts",
			interpreter: "bun",
			env: {
				NODE_ENV: "production",
			},
		},
	],
};
