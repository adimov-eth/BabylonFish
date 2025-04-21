module.exports = {
	apps: [
		{
			name: "trans-bot",
			script: "packages/telegram/dist/index.js",
			interpreter: "bun",
			env: {
				NODE_ENV: "production",
			},
			max_memory_restart: "300M",
			restart_delay: 3000,
			// Ensure the bot restarts on crashes
			autorestart: true,
			// Watch for changes in dist directory
			watch: false,
			// Merge logs
			merge_logs: true,
			// Error log file
			error_file: "logs/error.log",
			// Out log file
			out_file: "logs/out.log",
			// Time format for logs
			time: true,
		},
	],
};
