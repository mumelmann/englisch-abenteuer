# Unit format

One unit = one file in `units/`, listed in `units/index.json` (display order). All UI text and explanations are **German**; exercise sentences are **British English** (Camden Market 5, Westermann, class 5).

```json
{
  "id": "u02",                      // unique, never change later (progress is keyed on it)
  "title": "Welt 2: …", "subtitle": "…", "icon": "🏰",
  "boss": { "title": "Endgegner: …", "icon": "🐉" },
  "lessons": [ { "id": "short-id", "title": "…", "icon": "🗡️", "explain": [ … ], "exercises": [ … ] } ]
}
```

`explain` blocks (strings may contain `<b>`): `{ "h": "Heading" }`, `{ "p": "Text" }`, `{ "tip": "Merksatz" }`, `{ "table": [["English","Deutsch"], …] }`.

## Exercise types

| type | fields | notes |
|---|---|---|
| `choice` | `q` (exactly one `___`), `options`, `answer`, `why?`, `hint?` | 3 options |
| `gap` | `q` (one `___`), `answer` (string or array of accepted spellings), `hint?`, `why?` | typed; case/punctuation ignored |
| `word` | `de`, `answer`, `options?` | vocabulary; typed when no options |
| `order` | `answer` (full sentence), `de?`, `extra?` (distractor words), `alt?` | words split on spaces |
| `fix` | `q`, `wrong` (word occurring exactly once), `right`, `why?` | tap the wrong word |
| `match` | `pairs` [[left,right] × 5] | left items must be unique |
| `listen` | `answer`, `options?` | read aloud by the browser; keep typed ones short |

`why` is a short German explanation shown after answering. Append new exercises at the end of a lesson (ids are positional).

## Content guidelines

- 20–26 exercises per lesson, mixed types; a session draws 10, the boss draws 12 from the whole unit.
- Short sentences, A1 level, one grammar point per lesson; target typical mistakes of German speakers.
- Use characters Adam likes as names only: Zelda (Link, Zelda, Ganon), Mario / Mario Kart (Mario, Luigi, Peach, Bowser, Yoshi, Toad, Daisy), Mickey Mouse and DuckTales (Mickey, Minnie, Donald, Goofy, Scrooge, Huey, Dewey and Louie).
- Write new sentences; do not copy textbook text. Scans only define the scope (vocabulary and grammar).
