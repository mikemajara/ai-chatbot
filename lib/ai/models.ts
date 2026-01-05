// Default model ID - fallback when no model is selected
export const DEFAULT_CHAT_MODEL = "google/gemini-2.5-flash-lite";

// ChatModel type matches the database Model type
export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  modelType: string | null;
  contextWindow: number | null;
  pricingInput: number | null;
  pricingOutput: number | null;
  pricingImageGen: number | null;
  pricingWebSearch: number | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};
