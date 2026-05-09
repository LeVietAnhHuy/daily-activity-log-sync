import type { LanguageCode, Translation } from "./types";
import en from "./en";
import vi from "./vi";
import ko from "./ko";
import ja from "./ja";

export const translations: Record<LanguageCode, Translation> = { en, vi, ko, ja };
