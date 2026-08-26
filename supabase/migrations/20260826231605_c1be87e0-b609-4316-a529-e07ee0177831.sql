DO $$
DECLARE
  lv text; u int; i int := 0; sid uuid; uid uuid; t text; ord int;
  levels text[] := ARRAY['A1.1','A1.2','A2.1','A2.2','B1.1','B1.2','B2.1','B2.2','C1.1','C1.2','C2.1','C2.2'];
  types text[] := ARRAY['reading','listening','grammar','vocabulary','practice','task','test'];
  labels text[] := ARRAY['Reading','Listening','Grammar','Vocabulary','Practice','Tasks','Test'];
BEGIN
  FOREACH lv IN ARRAY levels LOOP
    i := i + 1;
    SELECT id INTO sid FROM public.sections WHERE name = lv;
    IF sid IS NULL THEN
      INSERT INTO public.sections (name, description, order_index, is_visible, is_locked)
      VALUES (lv, 'Level ' || lv, i, true, false) RETURNING id INTO sid;
    END IF;
    FOR u IN 1..8 LOOP
      SELECT id INTO uid FROM public.units WHERE section_id = sid AND order_index = u;
      IF uid IS NULL THEN
        INSERT INTO public.units (section_id, title, description, order_index, is_active, is_published)
        VALUES (sid, 'Unit ' || u, 'Unit ' || u || ' of level ' || lv, u, true, true) RETURNING id INTO uid;
      END IF;
      ord := 0;
      FOR j IN 1..array_length(types,1) LOOP
        ord := ord + 1;
        t := types[j];
        IF NOT EXISTS (SELECT 1 FROM public.unit_contents WHERE unit_id = uid AND content_type = t) THEN
          INSERT INTO public.unit_contents (unit_id, content_type, title, body, order_index, is_published, data)
          VALUES (uid, t, labels[j] || ' — ' || lv || ' Unit ' || u,
            labels[j] || ' content for ' || lv || ' Unit ' || u || E'\n\nEdit this from Admin > Sections.',
            ord, true, '{}'::jsonb);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;