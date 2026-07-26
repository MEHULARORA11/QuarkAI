import { createOpenAI, openai } from "@ai-sdk/openai";

/** Default OpenAI model used when a conversation has no model override. */
export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

/**
 * Returns an OpenAI language model instance for chat completions.
 *
 * @param modelId - Optional model identifier; falls back to {@link DEFAULT_CHAT_MODEL}.
 * @param userApiKey - Optional BYOK key. When provided, a provider instance scoped
 * to that key is used instead of the app's default env-configured client, so the
 * request is billed against the user's own OpenAI account.
 */
export function getChatModel(modelId?: string | null, userApiKey?: string) {
    const model = modelId || DEFAULT_CHAT_MODEL;

    if (userApiKey) {
        const scopedProvider = createOpenAI({ apiKey: userApiKey });
        return scopedProvider(model);
    }

    return openai(model);
}