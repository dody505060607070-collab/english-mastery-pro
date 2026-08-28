# Content backup & restore (survives remix / GitHub clone)

All curriculum data is kept **inside the repo**, so a remix or a `git clone` into
another Lovable workspace carries everything:

- `content-backup/content/*.json` — English curriculum (12 levels, 96 units, 672 sections, all questions)
- `content-backup/content-ar/*.json` — Arabic versions (used as optional side meaning)
- `content-backup/vocabulary/*.json` — 1,248 vocabulary entries (translation, phonetics, examples)
- `public/images/` + `public/site-assets/` — all lesson and site images

## Restoring the database in a new project

A remix creates a **fresh backend**, so re-import the data once:

```bash
# needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment
python3 scripts/en_restore.py    # units + English sections + questions + listening data
python3 scripts/ar_import.py     # optional: Arabic titles/bodies as data.ar_*
```

The scripts write through PostgREST (service role), are idempotent, and keep
existing image links and `order_index` ordering.
