# AI Travel Planner — Fixed Backend

Replace your existing `backend` folder with this folder's contents.

## Required environment variables

Copy `.env.example` to `.env` and set:

- `MONGO_URI`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `PEXELS_API_KEY` (optional; images simply return empty/null without it)

## Run

```bash
npm install
npm run dev
```

Production:

```bash
npm start
```

The backend starts only after MongoDB connects.

## AI fallback

Itinerary generation:
1. Gemini 3.8 Flash
2. Gemini 3.7 Flash
3. Gemini 3.6 Flash
4. Gemini 2.5 Flash
5. Groq GPT-OSS 120B
6. Groq GPT-OSS 20B

Chat:
1. Gemini 3.8 Flash
2. Groq GPT-OSS 120B
3. Groq GPT-OSS 20B

If Gemini quota is exhausted, the request proceeds to Groq.
