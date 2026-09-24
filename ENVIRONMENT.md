# Environment & API Key Setup

This project reads secrets from environment variables. To set up local development:

1. Copy `.env.example` to `.env` in the project root.

   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your API keys:

- `OPENAI_API_KEY` — required for live transcription, translation and summaries.
- `GROQ_API_KEY` — optional, if you want to use Groq Llama as primary engine.
- `GEMINI_API_KEY` — optional, for Google Gemini fallback.

3. Keep `.env` private. The repository already ignores `.env` via `.gitignore`.

4. In production, set these variables in your hosting platform's secrets/config (do NOT commit them).

Notes:
- The frontend Settings modal allows entering an API key at runtime which will be used for direct calls or proxied to the backend.
- If you previously committed API keys, rotate/revoke them immediately.
