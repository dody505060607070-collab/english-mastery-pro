# Redesign and Enhancement Plan for Blue Language Academy

This plan aims to implement a new "Practice" section with free and paid tiers, featuring native-voice pronunciation and Arabic translations. It also includes adding a high-quality FAQ/Questions section at the bottom of the homepage, enhancing 3D effects, and implementing site-wide improvements based on user suggestions.

## User Interface & Experience
- **Hero Section "Practice" Entry**: Add a prominent "Practice" (تدريب) button/icon in the Hero section that opens a selection between "Free Practice" and "Premium Practice".
- **Practice Interface**:
  - **Vocabulary List**: A clean, interactive grid of vocabulary cards.
  - **Native Pronunciation**: Integrate the Web Speech API (or a high-quality TTS) for real-human sounding pronunciation.
  - **Translation**: Display Arabic translations for each English word.
  - **3D Interactive Cards**: Use `framer-motion` for advanced 3D hover and flip effects on vocabulary cards.
- **Enhanced 3D Effects**:
  - Add floating 3D icons (books, speech bubbles, lightbulbs) throughout the homepage with parallax effects.
  - Implement glassmorphism with deeper shadows and animated gradients for a premium "3D depth" feel.
- **Homepage Questions (FAQ) Enhancements**:
  - Add a dedicated "Student Questions & Answers" section at the bottom of the homepage (distinct from the legal FAQ).

## Technical Implementation
- **New Routes**:
  - `src/routes/_authenticated/practice/index.tsx`: Selection between Free/Paid.
  - `src/routes/_authenticated/practice/free.tsx`: Free vocabulary practice.
  - `src/routes/_authenticated/practice/premium.tsx`: Advanced practice for subscribers.
- **Database Additions**:
  - Create a `vocabulary` table to store words, categories, translations, and audio URLs.
  - Create a `practice_sessions` table to track user progress in the practice section.
- **Web Speech API**:
  - Implementation of a custom hook `useTextToSpeech` for high-quality pronunciation.
- **3D Components**:
  - Create `ThreeDCard` and `FloatingAsset` reusable components.

## Data Schema Changes
```sql
CREATE TABLE public.vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    phonetic TEXT,
    audio_url TEXT,
    category TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    vocabulary_id UUID REFERENCES public.vocabulary(id),
    mastery_level INT DEFAULT 0,
    last_practiced TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT ON public.vocabulary TO anon, authenticated;
GRANT ALL ON public.practice_sessions TO authenticated;
```

## Review Checklist
- [ ] Practice icon is visible and functional in the Hero section.
- [ ] Pronunciation works with a natural-sounding voice.
- [ ] Arabic translations are accurate and well-placed.
- [ ] 3D effects are smooth and enhance the premium feel.
- [ ] Homepage Questions section is added at the bottom.
- [ ] Mobile responsiveness is maintained.