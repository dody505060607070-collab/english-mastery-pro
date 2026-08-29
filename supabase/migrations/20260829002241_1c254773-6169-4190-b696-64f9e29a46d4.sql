-- 1) Revoke EXECUTE from PUBLIC/anon/authenticated on all SECURITY DEFINER functions
revoke execute on function public.is_account_active(uuid) from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.is_enrolled(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_staff(uuid) from public, anon, authenticated;
revoke execute on function public.issue_certificate(uuid) from public, anon, authenticated;
revoke execute on function public.quiz_course_id(uuid) from public, anon, authenticated;
revoke execute on function public.submit_quiz_attempt(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.add_xp(uuid, integer) from public, anon, authenticated;
revoke execute on function public.add_xp(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.can_read_content_object(text) from public, anon, authenticated;
revoke execute on function public.check_permission(uuid, text) from public, anon, authenticated;
revoke execute on function public.get_quiz_questions(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;

-- 2) Grant EXECUTE to service_role on all (server-side admin code, e.g. add_xp)
grant execute on function public.is_account_active(uuid) to service_role;
grant execute on function public.is_admin() to service_role;
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.is_enrolled(uuid, uuid) to service_role;
grant execute on function public.is_staff(uuid) to service_role;
grant execute on function public.issue_certificate(uuid) to service_role;
grant execute on function public.quiz_course_id(uuid) to service_role;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to service_role;
grant execute on function public.add_xp(uuid, integer) to service_role;
grant execute on function public.add_xp(uuid, integer, text) to service_role;
grant execute on function public.can_read_content_object(text) to service_role;
grant execute on function public.check_permission(uuid, text) to service_role;
grant execute on function public.get_quiz_questions(uuid) to service_role;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.has_role(uuid, public.app_role) to service_role;

-- 3) Grant EXECUTE to authenticated ONLY where required (RLS policy helpers + user-facing RPCs)
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_enrolled(uuid, uuid) to authenticated;
grant execute on function public.is_account_active(uuid) to authenticated;
grant execute on function public.can_read_content_object(text) to authenticated;
grant execute on function public.get_quiz_questions(uuid) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
grant execute on function public.issue_certificate(uuid) to authenticated;

-- 4) Split anon sections policy so anon never needs a SECURITY DEFINER function
drop policy if exists "Anyone can view visible sections" on public.sections;
create policy "Anon can view visible sections"
  on public.sections for select to anon
  using (is_visible = true);
create policy "Authenticated can view sections"
  on public.sections for select to authenticated
  using ((is_visible = true) or is_staff(auth.uid()));

-- 5) Restrict avatars bucket reads to owner or staff
drop policy if exists "Authenticated can view avatars" on storage.objects;
create policy "Users view own avatar, staff view all"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (((storage.foldername(name))[1] = (auth.uid())::text) or is_staff(auth.uid())));

-- 6) Restrict permissions / role_permissions reads to staff
drop policy if exists "Allow authenticated users to read permissions" on public.permissions;
create policy "Staff can read permissions"
  on public.permissions for select to authenticated
  using (is_staff(auth.uid()));
drop policy if exists "Allow authenticated users to read role_permissions" on public.role_permissions;
create policy "Staff can read role_permissions"
  on public.role_permissions for select to authenticated
  using (is_staff(auth.uid()));