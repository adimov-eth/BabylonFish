import type { Readable } from "node:stream";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { OpenAIVoice } from "@mastra/voice-openai";
import type { TranslationRequest, TranslationResponse } from "../types";

// Read API key from environment
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
	throw new Error("OPENAI_API_KEY environment variable is not set.");
}

// Initialize the voice provider with explicit API key
const voice = new OpenAIVoice({
	speechModel: { apiKey: openaiApiKey },
	listeningModel: { apiKey: openaiApiKey },
});

export const assistantAgent = new Agent({
	name: "Telegram Assistant",
	instructions: `You are a highly specialized translation engine. Your SOLE purpose is to translate the text provided in the prompt from the specified source language to the specified target language.

RULES:
1.  Translate the text accurately from the source language code (e.g., 'en') to the target language code (e.g., 'ru').
2.  Your response MUST contain ONLY the translated text.
3.  DO NOT include explanations, apologies, greetings, labels (like "Translation:"), language codes, or any other text besides the translation itself.
4.  Preserve the basic paragraph structure if applicable.
5.  If the input text cannot be translated or is nonsensical, return the original text.`,
	model: openai("gpt-4o"),
	memory: new Memory(),
	voice, // Add voice capabilities
});

/**
 * Translates text based on the provided request using the Mastra agent.
 *
 * @param request The translation request details.
 * @returns A promise resolving to the translation response.
 */
export const translateText = async (
	request: TranslationRequest,
): Promise<TranslationResponse> => {
	console.log("Attempting translation:", request);

	const { text, sourceLanguage, targetLanguage } = request;

	// Use a clearer, structured prompt
	const prompt = `Source Language: ${sourceLanguage}
Target Language: ${targetLanguage}
Text to Translate:
---
${text}
---`;

	try {
		const response = await assistantAgent.generate(prompt);

		if (!response?.text) {
			throw new Error("Agent did not return translated text.");
		}

		// TODO: Implement actual language detection if needed, potentially modify agent prompt
		const detectedLanguage = sourceLanguage; // Assuming input source is correct for now
		const confidence = 0.9; // Placeholder confidence

		return {
			translatedText: response.text.trim(),
			detectedLanguage,
			confidence,
		};
	} catch (error) {
		console.error("Translation failed:", error);
		// Return a response indicating failure
		return {
			translatedText: `[Translation Error: ${error instanceof Error ? error.message : "Unknown error"}]`,
			detectedLanguage: sourceLanguage,
			confidence: 0,
		};
	}
};

/**
 * Transcribes voice audio using the Mastra agent's voice capabilities.
 *
 * @param audioStream A readable stream containing the audio data.
 * @returns A promise resolving to the transcribed text.
 */
export const transcribeVoice = async (
	audioStream: Readable,
): Promise<string> => {
	console.log("Attempting transcription...");
	try {
		// Add filetype hint if known, otherwise let OpenAI detect
		// Explicitly type and check the result as Mastra types might be ambiguous
		const transcriptionResult = await assistantAgent.voice.listen(audioStream);

		if (typeof transcriptionResult !== "string") {
			console.error(
				"Transcription result was not a string:",
				transcriptionResult,
			);
			throw new Error("Agent did not return transcription text.");
		}

		console.log("Transcription successful:", transcriptionResult);
		return transcriptionResult;
	} catch (error) {
		console.error("Transcription failed:", error);
		throw new Error(
			`Transcription Error: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

/**
 * Converts text to speech using the Mastra agent's voice capabilities.
 *
 * @param text The text to synthesize.
 * @returns A promise resolving to a readable stream containing the audio data (likely MP3).
 */
export const textToSpeech = async (text: string): Promise<Readable> => {
	console.log("Attempting text-to-speech for:", text);
	try {
		// Note: OpenAI voice options for language/speaker might be limited via this interface
		// Default 'alloy' voice and auto-detected language likely used.
		// Specify filetype if needed, defaults often work.
		const audioStreamResult = await assistantAgent.voice.speak(text);

		if (!audioStreamResult) {
			throw new Error("Agent did not return audio stream.");
		}

		// Assume the ReadableStream returned by speak() is compatible with Node's Readable
		// This might require runtime checks or adaptation if issues arise.
		console.log("Text-to-speech successful.");
		return audioStreamResult as Readable;
	} catch (error) {
		console.error("Text-to-speech failed:", error);
		throw new Error(
			`Text-to-speech Error: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};
