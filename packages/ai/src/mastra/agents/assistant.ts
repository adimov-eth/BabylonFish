import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import type { TranslationRequest, TranslationResponse } from "../types";

export const assistantAgent = new Agent({
	name: "Telegram Assistant",
	instructions: `Assume the role of an expert multilingual translator specializing in high-fidelity, context-aware translation. Your task is to translate the provided text from the specified source language (ISO 639-1 code) to the specified target language (ISO 639-1 code). Your paramount objective is absolute accuracy in conveying the original meaning, intent, and complete context. Meticulously preserve the source text's specific tone (e.g., serious, humorous, sarcastic), register (formal/informal), cultural nuances, embedded humor, and any idiomatic expressions or slang. When a direct literal translation fails to capture the essence, you must select the closest natural-sounding cultural and semantic equivalent in the target language, ensuring the translation feels authentic and not stilted. Avoid overly literal translations that sacrifice naturalness or misinterpret nuance. Your response MUST consist solely and exclusively of the translated text. Do not include any introductory phrases, concluding remarks, explanations, annotations, labels (like "Translation:"), language codes, or any text whatsoever besides the translation itself. Preserve the basic paragraph structure of the source text if applicable. Do not add information not present in the original, nor omit crucial details.`,
	model: openai("gpt-4o"),
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
