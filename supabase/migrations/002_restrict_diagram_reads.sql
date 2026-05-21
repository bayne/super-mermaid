-- Prevent anonymous users from listing all diagram tokens.
-- Replace the blanket SELECT policy with a server-side function
-- that only returns a single diagram by exact ID.

DROP POLICY "Anyone can read diagrams" ON public.diagrams;

CREATE OR REPLACE FUNCTION get_diagram(p_id TEXT)
RETURNS SETOF public.diagrams
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.diagrams WHERE id = p_id LIMIT 1;
$$;
