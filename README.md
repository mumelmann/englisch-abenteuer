# Englisch-Abenteuer

Aplikacja do nauki angielskiego dla Adama (interfejs po niemiecku). Statyczna strona bez etapu budowania – wystarczy hosting plików (np. GitHub Pages).

## Uruchomienie lokalne

```bash
python3 -m http.server 8000
```

Potem otwórz `http://localhost:8000`.

## Hosting na GitHub Pages

W repozytorium: Settings → Pages → Source: „Deploy from a branch" → `main` / root. Strona pojawi się pod `https://<login>.github.io/<repo>/`.

## Dodawanie nowego bloku

1. Zeskanuj strony z podręcznika (Camden Market 5) i przekaż je Claude z prośbą o nowy blok.
2. Claude tworzy plik `units/unit-XX-nazwa.json` według `docs/UNIT_FORMAT.md` i dopisuje go do `units/index.json`.
3. Po wgraniu zmian strona aktualizuje się sama.

Postęp zapisuje się lokalnie w przeglądarce, osobno na każdym urządzeniu.
