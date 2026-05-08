# npm tracker

Track npm package updates and get AI-powered summaries of what changed.

## What it does

- Search for any npm package and subscribe to it
- Dashboard shows packages split into **Updates available** vs **Up to date**
- Expand any package to read its GitHub release notes inline
- Hit **✦ AI Summary** to get a plain-English bullet-point summary of a release via a local Ollama model
- **Mark seen** to acknowledge an update and clear the badge
- All subscriptions are stored in browser localStorage — no account or database needed

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## AI summaries (Ollama)

Summaries run against a locally running [Ollama](https://ollama.com) instance. Make sure it's running and you have a model pulled:

```bash
ollama serve
ollama pull llama3.2
```

Then open the settings gear in the app and set your model name. For remote Ollama instances, set the `OLLAMA_BASE_URL` env var instead of using the UI (the UI only allows loopback addresses for security).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | *(UI value)* | Override the Ollama base URL server-side |
| `OLLAMA_MODEL` | *(UI value)* | Override the Ollama model server-side |

## API routes

| Route | Description |
|---|---|
| `GET /api/package/[name]` | Fetches latest version and metadata from the npm registry |
| `GET /api/changelog?repoUrl=` | Fetches the last 5 GitHub releases for a package |
| `POST /api/summarize` | Sends a changelog to Ollama and returns a bullet-point summary |
