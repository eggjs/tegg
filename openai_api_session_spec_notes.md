# OpenAI API: session id patterns (notes)

> Purpose: capture the OpenAI-side precedent for a `session_id`-like identifier, to inform tegg/Claude SDK v2-style session reuse on HTTP requests.
>
> Source (fetched): https://platform.openai.com/docs/api-reference/realtime-sessions

## 1) Realtime API: session object contains an `id`

In the Realtime API client secret creation endpoint:

- `POST https://api.openai.com/v1/realtime/client_secrets`
- request body includes an optional `session` object (configuration)
- response returns a `session` object that includes:
  - `object`: `realtime.session`
  - `id`: e.g. `sess_C9CiUVUzUzYIssh3ELY1d`

Excerpt (response shape):

```json
{
  "value": "ek_...",
  "expires_at": 1756310470,
  "session": {
    "type": "realtime",
    "object": "realtime.session",
    "id": "sess_...",
    "model": "gpt-realtime",
    "instructions": "..."
  }
}
```

So OpenAI’s precedent is: **the server issues a session object with a stable `id` field**.

## 2) Implication for tegg/Claude-session-in-HTTP design

If we want an Egg-style HTTP experience ("ctx has a session; create on demand; reuse if exists"):

- Accept an optional `session_id` field in request body (or header)
  - If present → attempt to resume/reuse
  - If absent → create a new session and return its `session_id`

- Return `session_id` in response body (and/or header) so clients can persist it.

### Suggested minimal HTTP contract

Request:
```json
{
  "session_id": "sess_...", 
  "input": "..."
}
```

Response:
```json
{
  "session_id": "sess_...", 
  "events": [/* streamed or buffered events */],
  "result": { /* success/error */ }
}
```

## 3) Open questions

- Whether to use `session_id` vs `sessionId` naming (OpenAI uses `id` inside `session`, but many APIs use `*_id`).
- Whether session id should be scoped per-user, per-app, or per-tenant.
- Where to persist sessions: memory (dev) vs redis/db (prod).
