# Blue Language — Lovable AI Handoff Guide

## Read this first
This ZIP is a complete content-and-assets handoff for the **Blue Language** English-learning web app. It contains the 12-level curriculum from **A1.1 through C2.2**, vocabulary banks, question data, TTS-ready listening transcripts, curriculum image metadata, physical lesson images, site/section/topic art, source image sheets, original requirements, methodology notes, and QA reports.

Do **not** rename curriculum JSON files or lesson image files. The JSON `image` field stores a filename only and is designed to resolve to `/images/<filename>`.

## Package status
The final audit reports **0 validation errors**. See `VALIDATION_REPORT.txt` for the machine checks and exact word-count ranges.

Final counts:
- 12 levels
- 96 units
- 7 sections per unit
- 672 curriculum section records
- 1,248 vocabulary-bank entries
- 2,688 practice/task/test questions
- 288 curriculum lesson images + 288 image prompts
- 50 site / cover / topic images

## Folder map

```text
/content/
  A1.1.json ... C2.2.json

/vocabulary/
  A1.1.json ... C2.2.json

/images/
  IMAGE_LIST.csv
  LESSON_IMAGE_PROVENANCE.csv
  A1.1-u1-reading.jpg ... C2.2-u8-grammar.jpg   (288 files)
  /site-assets/                                      (50 files)
  /source-contact-sheets/                            (source composite PNGs)
  /source-separate-generated/                        (original separate PNGs)
  images-README.txt

/requirements/
  CONTENT-PROMPT-original.md
  IMAGE-PROMPTS-original.md

README.md
LOVABLE_AI_README.md
CURRICULUM_MAP.md
SOURCES_AND_METHODOLOGY.md
VALIDATION_REPORT.txt
PACKAGE_MANIFEST.json
IMPORT_ORDER.txt
```

## Exact import order
1. Import level files from `/content/` in this order: A1.1, A1.2, A2.1, A2.2, B1.1, B1.2, B2.1, B2.2, C1.1, C1.2, C2.1, C2.2.
2. Import the matching `/vocabulary/<level>.json` after each level or after all curriculum files.
3. Copy the 288 JPG files located directly in `/images/` to the app's public lesson-image directory without renaming them.
4. Resolve each curriculum `image` filename as `/images/<filename>` (or the equivalent public asset path in the project).
5. Copy `/images/site-assets/` for landing pages, section covers, and generic topic art.
6. Keep `IMAGE_LIST.csv` as the canonical manifest for lesson-image filenames and regeneration prompts.

## Curriculum JSON schema
Each level has:

```json
{
  "level": "A1.1",
  "units": [
    {
      "order_index": 1,
      "title": "...",
      "description": "...",
      "contents": [
        {
          "content_type": "reading",
          "title": "...",
          "order_index": 1,
          "body": "...",
          "image": "A1.1-u1-reading.jpg",
          "data": {}
        }
      ]
    }
  ]
}
```

Every unit has exactly these seven sections in this order:
`reading`, `listening`, `grammar`, `vocabulary`, `practice`, `tasks`, `test`.

## Body parser rules
The `body` field intentionally uses a small text-marker language. Render it rather than showing the markers literally.

- `## Heading` or `**Heading:**` → styled section heading
- `- item` → bullet item in ordinary sections
- Inside `## Examples` in grammar:
  - `+ sentence` → positive example
  - `- sentence` → negative example
  - `? sentence` → question example
- `~~wrong sentence~~ -> correct sentence` → common-mistake block
- `| col | col |` → table row
- `==yellow|text==` → highlighted text; supported colors: yellow, green, blue, pink, orange
- `!!red|text!!` → colored text; supported colors: red, blue, green, orange, purple

Important parser detail: a leading `-` means a normal bullet outside the Grammar `## Examples` block; inside that block it is a negative example.

## Listening implementation
Listening records use:

```json
"data": {
  "tts_text": "...",
  "accent": "us"
}
```

Use `tts_text` for text-to-speech. The transcript in `body` includes speaker labels for display; `tts_text` is the clean speech source.

## Practice and tests
`practice` and `test` store questions under `data.questions`.
Supported types:
- `multiple_choice`
- `text`
- `true_false`

Every question includes `correct_answer` and `explanation`. Do not discard the explanation; show it after submission or in review mode.

## Tasks
The `tasks` body contains three productive tasks and a model answer for each. They are designed for speaking/writing output rather than auto-grading. If the `tasks.data.questions` array is present, preserve it as supplemental structured task data.

## Vocabulary banks
Each `/vocabulary/<level>.json` contains at least 100 entries; this package has 104 per level. Fields:
- `word`
- `translation`
- `phonetic_us`
- `phonetic_uk`
- `example`
- `example_ar`
- `category`

Vocabulary is unique across levels. The A1.1 category field has been normalized to the same `A1.1 Unit ...` format used by all other levels.

## Image implementation
### Lesson images
There are **288 physical JPGs** directly under `/images/`, exactly matching all filenames referenced by the curriculum JSON and `IMAGE_LIST.csv`. All are 1600×900 (16:9).

The first A1.1 lesson images were generated separately for their exact scenarios. To accelerate completion of the full visual library, the remaining lesson images were extracted from generated composite educational asset sheets. They are valid deployment assets and ensure there are no broken curriculum image references.

`IMAGE_LIST.csv` remains the canonical source for the **specific per-lesson generation prompt**. If a future art pass regenerates any image, overwrite the corresponding JPG while keeping the filename unchanged. No curriculum JSON change is then required.

`LESSON_IMAGE_PROVENANCE.csv` records which source sheet/tile produced each current lesson JPG.

### Site assets
`/images/site-assets/` contains the 50 images specified by the original image brief:
- 10 brand/site assets
- 10 section-cover assets
- 10 A1 topic assets
- 10 A2/B1 topic assets
- 10 B2/C1/C2 topic assets

Use `images-README.txt` for suggested placements.

### Source art
`/images/source-contact-sheets/` contains the generated high-density contact sheets used as visual source banks. `/images/source-separate-generated/` keeps the original separate generated PNGs. These are source/reference files and are not required for ordinary runtime rendering.

## Corrections completed before final packaging
The final pass specifically corrected the following issues found during QA:
- A1.1 vocabulary `category` values now include the level prefix.
- One B2.1 Grammar negative example that lacked explicit negation was rewritten correctly.
- 149 B1/B2 reading-padding sentences of the form `A final detail...` were removed and replaced with topic-specific prose while preserving CEFR reading-length bands.
- B1/B2 vocabulary-bank Arabic example placeholders were removed. Their bilingual examples were normalized so English and Arabic example fields now form matching pedagogical pairs.
- The full 12-level package was revalidated after those edits.

## Do not "simplify" the curriculum during import
Do not merge levels, delete answer explanations, shorten grammar bodies, or flatten the seven content types. The level progression and section structure are deliberate.

## Recommended app entities
A straightforward implementation can use:
- `levels`
- `units`
- `contents`
- `vocabulary_entries`
- `questions`

Keep `order_index` as the source of truth for ordering.

## QA / verification
- `VALIDATION_REPORT.txt` = human-readable final QA result
- `PACKAGE_MANIFEST.json` = file inventory with byte size and SHA-256 checksum
- `CURRICULUM_MAP.md` = curriculum progression overview
- `SOURCES_AND_METHODOLOGY.md` = design rationale and reference framework
- `/requirements/` = original briefs used to build the package

If a file appears to conflict with a derived assumption in the app, treat the JSON and CSV files in this ZIP as the canonical production data, and treat the original prompt files as requirements/history.
