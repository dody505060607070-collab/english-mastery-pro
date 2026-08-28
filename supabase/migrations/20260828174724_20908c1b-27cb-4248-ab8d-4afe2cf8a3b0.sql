ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS example text;
CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_word_category_key ON public.vocabulary (lower(word), coalesce(category,''));