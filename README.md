# Emoji Lexicon Static Site

This repository contains the data preparation scripts and a Plotly-powered static site (in `docs/`) that mirrors the Emoji Sentiment Ranking experience with the custom Emoji Lexicon 1.5 dataset.

## Getting Started

1. Create a virtual environment and install the requirements listed in `LexiconCreation.py` if you want to regenerate the CSV from the raw tweets/annotations (optional).  
2. To generate the JSON assets used by the site, run:

```bash
python scripts/generate_site_data.py
```

This reads `Emoji_Lexicon_1.5.csv`, reconstructs per-score counts, enriches each emoji with a friendly name, and exports the following files:

- `docs/data/emoji_summary.json`
- `docs/data/emoji_scores_expanded.json`

These files are small enough to live in the repository so GitHub Pages can serve them directly.

## Local Preview

You can open `docs/index.html` directly in the browser, or start a quick HTTP server:

```bash
cd docs
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploying to GitHub Pages

GitHub Pages can serve the `docs/` folder automatically:

1. Open the repository settings on GitHub.
2. Under **Pages**, choose the `main` branch and the `/docs` folder.
3. Save—GitHub will provision `https://<username>.github.io/EmojiLexicon/`.

Whenever the CSV changes, rerun `python scripts/generate_site_data.py`, commit the updated JSON/data, and Pages will refresh with the new visualization.

