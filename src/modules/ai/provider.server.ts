import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AiProvider, AiModel } from "./types";
import { AiError } from "./types";

/**
 * Resolve a language model from provider + model identifiers.
 *
 * All traffic goes through the Lovable AI Gateway (OpenAI-compatible),
 * which supports Gemini / GPT / Claude model ids and needs no user key.
 */
export function getModel(_provider: AiProvider, model: AiModel) {
  const lovableKey = process.env.LOVABLE_API_KEY;

  if (!lovableKey) {
    throw new AiError(
      "PROVIDER",
      "LOVABLE_API_KEY is not configured. Add it to your environment variables.",
      500,
    );
  }

  const gateway = createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": lovableKey },
  });

  return gateway(model);
}


export const DEFAULT_MODEL: AiModel = "google/gemini-2.5-flash";
export const DEFAULT_PROVIDER: AiProvider = "lovable-gateway";
