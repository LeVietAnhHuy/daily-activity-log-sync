export const SUPPORTED_LANGUAGES = ["en", "vi", "ko", "ja"] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];
export type Translation = Record<string, string>;
export type TranslationKey = string;
