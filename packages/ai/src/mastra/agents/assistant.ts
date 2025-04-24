import type { Readable } from "node:stream";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { OpenAIVoice } from "@mastra/voice-openai";
import type { TranslationRequest, TranslationResponse } from "../types";

// Initialize the voice provider
const voice = new OpenAIVoice();

export const assistantAgent = new Agent({
	name: "Telegram Assistant",
	instructions: `Assume the role of an expert multilingual translator specializing in high-fidelity, context-aware translation. Your task is to translate the provided text from the specified source language (ISO 639-1 code) to the specified target language (ISO 639-1 code). Your paramount objective is absolute accuracy in conveying the original meaning, intent, and complete context. Meticulously preserve the source text's specific tone (e.g., serious, humorous, sarcastic), register (formal/informal), cultural nuances, embedded humor, and any idiomatic expressions or slang. When a direct literal translation fails to capture the essence, you must select the closest natural-sounding cultural and semantic equivalent in the target language, ensuring the translation feels authentic and not stilted. Avoid overly literal translations that sacrifice naturalness or misinterpret nuance. Your response MUST consist solely and exclusively of the translated text. Do not include any introductory phrases, concluding remarks, explanations, annotations, labels (like "Translation:"), language codes, or any text whatsoever besides the translation itself. Preserve the basic paragraph structure of the source text if applicable. Do not add information not present in the original, nor omit crucial details.`,
	model: openai("gpt-4o"),
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

	const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}:

${text}`;

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
