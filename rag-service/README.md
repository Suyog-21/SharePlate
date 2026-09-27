# SharePlate RAG Service

A small FastAPI service that powers the SharePlate in-app chatbot ("SharePlate
Assistant") using **domain-grounded retrieval-augmented generation (RAG)** -
**not** model fine-tuning.

For every chat message, this service:

1. Retrieves relevant SharePlate knowledge from `knowledge_base.py` (simple
   local keyword matching - no embeddings, no vector database).
2. Retrieves relevant **live** data from the SharePlate MySQL database
   (`ecorescue_db`) via `db.py`.
3. Looks up the current logged-in user's real record in the database (if a
   `uid` was sent), instead of trusting stats sent by the browser.
4. Includes the current frontend page and recent conversation history.
5. Builds a SharePlate-specific system prompt from all of the above.
6. Sends everything to an **OpenAI-compatible** LLM (configurable - works
   with xAI/Grok or any other compatible provider) via `llm_client.py`.

## Files

| File               | Purpose                                             |
|--------------------|------------------------------------------------------|
| `main.py`          | FastAPI app, request validation, `/health`, `/chat`  |
| `knowledge_base.py`| SharePlate knowledge documents + keyword retrieval   |
| `db.py`            | Live MySQL access (posts, users)                     |
| `llm_client.py`    | OpenAI-compatible LLM client + error handling        |
| `requirements.txt` | Python dependencies                                  |
| `.env.example`     | Example environment configuration                    |

## Setup

```bash
cd rag-service
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt

# Windows (PowerShell)
Copy-Item .env.example .env
# macOS/Linux
cp .env.example .env
```

Then edit `.env` and fill in real values - at minimum, a valid `LLM_API_KEY`
and a `LLM_CHAT_MODEL` that your provider account actually supports, and your
MySQL credentials if they differ from the defaults.

Run it:

```bash
python main.py
```

The service listens on `http://localhost:8000` by default (configurable via
`RAG_PORT`).

## Endpoints

### `GET /health`

```json
{ "status": "ok", "service": "shareplate-rag" }
```

### `POST /chat`

Request body:

```json
{
  "message": "What food is currently available?",
  "user": { "uid": "abc123", "name": "Fresh Bites", "role": "restaurant" },
  "page": "/restaurant",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hi! How can I help with SharePlate?" }
  ]
}
```

Only `message` is required. `message` is limited to 4000 characters;
`history` is trimmed to the most recent messages and each message's content
is length-limited server-side.

Response body:

```json
{
  "answer": "...",
  "sources": ["Restaurant Workflow", "Live SharePlate database (posts)"]
}
```

## LLM provider configuration (any OpenAI-compatible API)

This service calls `POST {LLM_BASE_URL}/chat/completions` using plain
`httpx` - it does **not** require the OpenAI Python SDK and is not
hard-coded to OpenAI. Configure it with:

```
LLM_BASE_URL=https://api.x.ai/v1
LLM_API_KEY=YOUR_XAI_API_KEY
LLM_CHAT_MODEL=grok-4.7
```

`LLM_CHAT_MODEL=grok-4.7` in `.env.example` is only a **placeholder default**.
You must replace it with a model name that is currently available on your
own xAI (or other provider) account - model availability changes over time
and this code cannot know which models your account can use.

A valid API key and provider access are required; the code cannot bypass
provider authentication or billing. If your API key is invalid or your
account lacks access to a model, the service will report a clear
authentication/model error rather than pretending the request succeeded.

### Error handling

The service distinguishes between several provider failure modes and returns
a specific, safe message for each (missing key, invalid/forbidden key, model
or endpoint not found, rate limiting, provider server errors, network
errors, and malformed provider responses). It never prints your API key,
`Authorization` header, or MySQL password to the terminal - only a
sanitized, useful diagnostic (provider name, base URL, model, HTTP status,
and a short error string).

## Live data and "no fake data"

If MySQL is unreachable, `/chat` still responds (it never crashes), but it
tells the assistant - and therefore the user - that live database
information is currently unavailable, instead of making anything up.

Knowledge retrieval here is intentionally simple: plain lowercase word
matching between the question and the knowledge documents in
`knowledge_base.py`. There is no embeddings model and no vector database
requirement, so this works with any OpenAI-compatible provider, including
ones that don't offer an embeddings endpoint.

## This is RAG, not fine-tuning

Nothing in this service trains or fine-tunes any model. "Grounded for
SharePlate" here means: a SharePlate-specific system prompt, SharePlate
knowledge retrieval, live database retrieval, and role/page-aware context -
combined at request time and sent to a general-purpose LLM.
