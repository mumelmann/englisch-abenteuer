# Englisch-Abenteuer

Static, no-build web app (vanilla JS) for a 10-year-old learning English at a German school. UI language is German; the parent (repo owner) speaks Polish.

- `js/app.js` – all logic; `css/style.css` – styles; `units/*.json` – content.
- New content: follow `docs/UNIT_FORMAT.md`, add the file name to `units/index.json`.
- No `confirm()`/`alert()`; use `ask()` from app.js.
- Test locally with `python3 -m http.server` and a browser.
