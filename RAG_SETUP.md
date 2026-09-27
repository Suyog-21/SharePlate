# SharePlate RAG Chatbot - Setup Guide

SharePlate now includes an in-app assistant ("SharePlate Assistant") powered
by a domain-grounded **RAG (retrieval-augmented generation)** service. This
is **not** a fine-tuned model - it is a general-purpose LLM combined at
request time with SharePlate-specific knowledge, live database data, and the
current user/page context. See `rag-service/README.md` for full technical
details.

Running the full app now requires **three terminals**:

```
Terminal 1: backend       -> http://localhost:5000
Terminal 2: rag-service   -> http://localhost:8000
Terminal 3: frontend      -> http://localhost:5173
```

## A. Start MySQL

Make sure your local MySQL server is running and reachable with the
credentials you'll use below.

## B. Start the backend (unchanged)

```bash
cd backend
npm install
npm start
```

Backend runs at `http://localhost:5000`.

## C. Start the RAG service (new)

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

Now edit `rag-service/.env` and set real values:

```
LLM_BASE_URL=https://api.x.ai/v1
LLM_API_KEY=YOUR_XAI_API_KEY          # replace with a real key
LLM_CHAT_MODEL=grok-4.7               # replace with a model your account can use

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_PORT=3306
DB_NAME=ecorescue_db

RAG_PORT=8000
RAG_ALLOWED_ORIGINS=http://localhost:5173
```

Then start it:

```bash
python main.py
```

RAG service runs at `http://localhost:8000`.

## D. Start the frontend

```bash
cd frontend
npm install

# Windows (PowerShell)
Copy-Item .env.example .env
# macOS/Linux
cp .env.example .env

npm run dev
```

Frontend runs at `http://localhost:5173`.

`frontend/.env` only needs:

```
VITE_RAG_URL=http://localhost:8000
```

The LLM API key is **never** put in the frontend - it lives only in
`rag-service/.env` and is used server-side.

## Grok / xAI configuration

The RAG service talks to any **OpenAI-compatible** `/chat/completions` API,
configured entirely through environment variables - nothing is hard-coded to
a specific provider or model.

For xAI/Grok:

```
LLM_BASE_URL=https://api.x.ai/v1
LLM_API_KEY=YOUR_XAI_API_KEY
LLM_CHAT_MODEL=grok-4.7
```

Important notes:

- `grok-4.7` is only a placeholder. Replace `LLM_CHAT_MODEL` with a model
  name that is **currently available on your own xAI account** - model
  availability changes over time and this project cannot know which models
  your account can use.
- A valid API key and provider access/billing are required. The xAI API is
  **not free**, and there is no way for this code (or any code) to bypass
  provider authentication or billing.
- If the API key is invalid, missing, or lacks access to the chosen model,
  the RAG service will return a clear, specific error (see
  `rag-service/README.md` for the full list) instead of pretending the
  request succeeded.

## Known limitations

- Authentication in SharePlate (including the login used by this chatbot's
  "current user" context) is not production-grade: passwords are unhashed
  and the logged-in user is stored as plain JSON in `localStorage`. The RAG
  service was not asked to change this, and does not.
- Knowledge retrieval is simple local keyword matching, not semantic search;
  it does not require or use an embeddings API.
- There is no dedicated Admin Dashboard page in the current frontend, even
  though the `admin` role exists in the schema; the chatbot is aware of this
  and will say so if asked about admin features.
- If MySQL is unreachable, the chatbot will say that live data is
  unavailable rather than answering with live-data questions.

This is **domain-grounded RAG, not model fine-tuning**.
