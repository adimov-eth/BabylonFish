export interface TranslationRequest {
	text: string;
	sourceLanguage: string;
	targetLanguage: string;
	groupId: number;
}

export interface TranslationResponse {
	translatedText: string;
	detectedLanguage: string;
	confidence: number;
}
