CREATE TABLE IF NOT EXISTS public.student_level_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_level_access TO authenticated;
GRANT ALL ON public.student_level_access TO service_role;

ALTER TABLE public.student_level_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read their own level access"
ON public.student_level_access FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Staff read all level access"
ON public.student_level_access FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Staff manage level access"
ON public.student_level_access FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'teacher')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'teacher')
);

CREATE INDEX IF NOT EXISTS student_level_access_user_idx ON public.student_level_access(user_id);