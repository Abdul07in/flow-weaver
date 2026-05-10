
revoke execute on function public.claim_share_link(text) from public, anon;
grant execute on function public.claim_share_link(text) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
