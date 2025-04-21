# Building a Telegram Bot with Mastra AI Agent - Monorepo Guide

This guide demonstrates how to create a Telegram bot that acts as a proxy to a Mastra AI agent using a pnpm monorepo structure.

## Project Structure

```bash
ai-agent/
├── docs/
│   └── guide.md
├── packages/
│   ├── ai/               # Mastra AI agent package
│   │   ├── src/
│   │   │   └── mastra/
│   │   │       ├── agents/
│   │   │       └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/          # Shared types and utilities
│   │   └── types/
│   │       └── index.ts
│   └── telegram/        # Telegram bot implementation
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json         # Root workspace config
├── pnpm-workspace.yaml  # Workspace definition
└── tsconfig.json       # Base TypeScript config
```

## Prerequisites

- Node.js ≥18.0.0
- pnpm ≥8.0.0
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- OpenAI API Key (for the AI agent)

## Setup Steps

1. **Clone and Install Dependencies**

```bash
git clone <your-repo-url>
cd ai-agent
pnpm install
```

2. **Configure AI Package**

Create the AI agent in `packages/ai/src/mastra/agents/assistant.ts`:

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const assistantAgent = new Agent({
  name: "Telegram Assistant",
  instructions: "You are a helpful Telegram bot assistant. Be concise and friendly.",
  model: openai("gpt-4-turbo-preview"),
});
```

Register the agent in `packages/ai/src/mastra/index.ts`:

```typescript
import { Mastra } from "@mastra/core";
import { assistantAgent } from "./agents/assistant";

export const mastra = new Mastra({
  agents: {
    telegramAssistant: assistantAgent,
  },
});
```

3. **Setup Shared Types**

Define shared types in `packages/shared/types/index.ts`:

```typescript
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentResponse {
  text: string;
  toolCalls?: unknown[];
}
```

4. **Implement Telegram Bot**

Create the bot implementation in `packages/telegram/src/index.ts`:

```typescript
import { Bot } from "grammy";
import { Message, AgentResponse } from "@ai-agent/shared/types";
import "dotenv/config";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MASTRA_API_URL = process.env.MASTRA_API_URL || "http://localhost:4111";
const AGENT_ID = "telegramAssistant";

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const bot = new Bot(BOT_TOKEN);

async function callAgent(message: string): Promise<AgentResponse | null> {
  try {
    const response = await fetch(`${MASTRA_API_URL}/api/agents/${AGENT_ID}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }],
      }),
    });

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
  ctx.reply("Hello! I'm your AI assistant. How can I help?")
);

bot.catch((err) => {
  console.error("Bot error:", err);
});

// Start bot
bot.start();
```

5. **Package Configuration**

Configure each package's `package.json`:

`packages/ai/package.json`:
```json
{
  "name": "@ai-agent/ai",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "mastra dev",
    "build": "tsc"
  },
  "dependencies": {
    "@mastra/core": "latest",
    "@ai-sdk/openai": "latest"
  }
}
```

`packages/shared/package.json`:
```json
{
  "name": "@ai-agent/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  }
}
```

`packages/telegram/package.json`:
```json
{
  "name": "@ai-agent/telegram",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "grammy": "^1.21.1",
    "dotenv": "^16.4.1",
    "@ai-agent/shared": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

6. **Environment Setup**

Create `.env` in the `packages/telegram` directory:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
MASTRA_API_URL=http://localhost:4111
```

Create `.env` in the `packages/ai` directory:

```env
OPENAI_API_KEY=your_openai_key
```

## Running the Application

1. Start the AI agent:
```bash
cd packages/ai
pnpm dev
```

2. In a new terminal, start the Telegram bot:
```bash
cd packages/telegram
pnpm dev
```

## Development Workflow

1. Make changes to shared types in `packages/shared/types`
2. Implement AI agent logic in `packages/ai/src/mastra`
3. Develop bot features in `packages/telegram/src`
4. Use `pnpm build` in root to build all packages
5. Use `pnpm dev` in root to start development servers

## Deployment

The monorepo structure allows for independent deployment of each package:

- `packages/ai`: Deploy to Mastra Cloud or other serverless platforms
- `packages/telegram`: Deploy as a Node.js service (e.g., on Railway, Fly.io)

Remember to set appropriate environment variables in your deployment platforms.

## Best Practices

1. Keep shared types in `packages/shared`
2. Use workspace dependencies (`workspace:*`)
3. Maintain consistent TypeScript configuration
4. Follow the functional programming paradigm
5. Keep functions pure and composable
6. Use early returns for better error handling
7. Implement proper logging and monitoring

## Security Considerations

1. Never commit `.env` files
2. Use environment variables for sensitive data
3. Implement rate limiting for the bot
4. Validate all user inputs
5. Keep dependencies updated
6. Use proper error handling