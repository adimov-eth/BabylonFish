# Translation Bot Specification

## Overview

A Telegram bot that automatically translates messages in group chats between configurable language pairs. The bot monitors messages in the chat and provides translations in real-time, facilitating communication between speakers of different languages. Each group chat can have its own language pair configuration.

## Core Features

1. **Automatic Language Detection**
   - Detect message language based on group's configured language pair
   - Support for both single messages and multi-line text
   - Ignore non-text messages (stickers, media, etc.)

2. **Configurable Translation**
   - Support for any language pair supported by the translation service
   - Default Vietnamese ↔ English translation
   - Per-group language pair configuration
   - Preserve original message formatting when possible

3. **Group Chat Integration**
   - Works in Telegram group chats
   - Respects Telegram's privacy mode
   - Handles concurrent messages efficiently
   - Group-specific settings persistence

## Technical Architecture

### Components

1. **Telegram Bot (packages/telegram)**
   - Built with grammY framework
   - Handles message events and group chat interactions
   - Manages translation request flow
   - Handles group settings management

2. **AI Translation Service (packages/ai)**
   - Uses Mastra AI for translation
   - Implements language detection
   - Handles translation caching for efficiency
   - Supports multiple language pairs

### Data Flow

1. User sends message in group chat
2. Bot retrieves group's language configuration
3. Language detection determines if translation is needed
4. Translation is performed using group's language pair
5. Translated message is posted as a reply to original

## Implementation Details

### Group Configuration

```typescript
interface GroupConfig {
  chatId: number;
  languagePair: {
    primary: string;   // ISO 639-1 code (e.g., 'en', 'vi', 'es')
    secondary: string; // ISO 639-1 code
  };
  enabled: boolean;
  translateCommands: boolean;
  replyStyle: 'thread' | 'reply' | 'inline';
}

interface GroupConfigStore {
  get(chatId: number): Promise<GroupConfig>;
  set(chatId: number, config: GroupConfig): Promise<void>;
  delete(chatId: number): Promise<void>;
}
```

### Message Processing

```typescript
interface Message {
  id: number;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalMessageId: number;
  groupConfig: GroupConfig;
}
```

### Translation Agent

```typescript
interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  groupId: number;
}

interface TranslationResponse {
  translatedText: string;
  detectedLanguage: string;
  confidence: number;
}
```

### Group Management Commands

```typescript
interface GroupCommands {
  '/setlanguages': (primary: string, secondary: string) => Promise<void>;
  '/showconfig': () => Promise<string>;
  '/enable': () => Promise<void>;
  '/disable': () => Promise<void>;
  '/setstyle': (style: 'thread' | 'reply' | 'inline') => Promise<void>;
}
```

### Error Handling

- Handle rate limiting gracefully
- Provide clear error messages
- Implement retry logic for failed translations
- Validate language codes

## Performance Considerations

1. **Caching**
   - Cache frequent translations
   - Store language detection results
   - Cache group configurations
   - Implement TTL for cached items

2. **Rate Limiting**
   - Respect Telegram API limits
   - Implement queue for high-traffic situations
   - Batch similar translation requests
   - Per-group rate limits

3. **Resource Usage**
   - Optimize memory usage
   - Implement connection pooling
   - Monitor API usage
   - Efficient group config storage

## Security

1. **Privacy**
   - No message storage unless required for caching
   - Clear cache regularly
   - Respect user privacy settings
   - Secure storage of group configurations

2. **Access Control**
   - Admin-only bot configuration
   - Group-specific settings
   - Command access levels
   - Language pair restrictions if needed

## Configuration

```typescript
interface BotConfig {
  // Telegram settings
  TELEGRAM_BOT_TOKEN: string;
  PRIVACY_MODE: boolean;
  
  // Default translation settings
  DEFAULT_PRIMARY_LANG: string;
  DEFAULT_SECONDARY_LANG: string;
  SUPPORTED_LANGUAGES: string[];
  
  // Cache settings
  CACHE_TTL: number;
  MAX_CACHE_ITEMS: number;
  CONFIG_CACHE_TTL: number;
  
  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: number;
  MAX_REQUESTS_PER_GROUP: number;
  QUEUE_SIZE: number;
}
```

## Development Phases

1. **Phase 1: Basic Translation**
   - Set up bot framework
   - Implement basic translation
   - Add language detection
   - Implement group configuration storage

2. **Phase 2: Performance**
   - Add caching
   - Implement rate limiting
   - Optimize resource usage
   - Add group config caching

3. **Phase 3: Advanced Features**
   - Add admin commands
   - Implement group settings UI
   - Add usage statistics
   - Support for additional language pairs

## Testing Strategy

1. **Unit Tests**
   - Language detection accuracy
   - Translation quality
   - Cache functionality
   - Group config management

2. **Integration Tests**
   - Telegram API interaction
   - Translation service integration
   - Error handling
   - Config persistence

3. **Load Tests**
   - Concurrent message handling
   - Rate limit compliance
   - Cache performance
   - Multi-group scalability

## Monitoring

1. **Metrics**
   - Translation success rate
   - Response times
   - API usage
   - Error rates
   - Per-group usage statistics

2. **Logging**
   - Error tracking
   - Usage patterns
   - Performance bottlenecks
   - Configuration changes

## Future Enhancements

1. Support for additional languages
2. Message formatting preservation
3. Custom translation rules
4. User preferences within groups
5. Translation quality feedback
6. Language auto-detection override
7. Group translation statistics dashboard
8. Bulk configuration management

## Dependencies

- grammY for Telegram bot framework
- Mastra AI for translation
- pnpm for package management
- Bun for runtime
- Database for group config persistence 