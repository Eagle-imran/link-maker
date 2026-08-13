# Link-creation API

## Create a tracked link

```http
POST /api/links
Content-Type: application/json
```

### Request

```json
{
  "url": "https://youtu.be/dQw4w9WgXcQ",
  "sub": false
}
```

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `url` | string | Yes | Any supported YouTube video or channel URL |
| `sub` | boolean | No | For channels, request YouTube subscribe confirmation; only literal `true` enables it |

Unknown fields are ignored. A valid video may include `sub`, but it has no
effect on the destination.

### Success: `200 OK`

```json
{
  "code": "a1b2c3d4",
  "shortUrl": "https://example.com/s/a1b2c3d4",
  "statsUrl": "https://example.com/s/a1b2c3d4/stats?key=examplekey123456"
}
```

The response origin is derived from the request URL. The example identifiers
are illustrative and must not be used as assumptions about an existing link.

### Invalid request: `400 Bad Request`

Malformed JSON:

```json
{ "error": "Invalid request body." }
```

Missing, non-string, unsupported, or invalid YouTube URL:

```json
{ "error": "That doesn't look like a YouTube link." }
```

### Rate limit: `429 Too Many Requests`

```json
{ "error": "Rate limit reached — try again in an hour." }
```

The default limit is 20 creation attempts per IP in a one-hour fixed window.
It is an anti-abuse control, not an authentication or security boundary. No
`Retry-After` response header is currently emitted.

### Persistence unavailable: `503 Service Unavailable`

```json
{ "error": "Tracking is unavailable right now — try an untracked link." }
```

This response covers missing Redis configuration, Redis failures, and failure
to allocate a unique code after five attempts.

## Example

```bash
curl --request POST http://localhost:3000/api/links \
  --header 'content-type: application/json' \
  --data '{"url":"https://youtu.be/dQw4w9WgXcQ","sub":false}'
```

Do not log or publish the returned `statsUrl`.
