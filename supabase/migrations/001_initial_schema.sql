CREATE TABLE public.diagrams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Diagram',
  content TEXT NOT NULL DEFAULT 'graph TD
  A[Start] --> B[End]',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diagrams_updated_at
  BEFORE UPDATE ON public.diagrams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read diagrams" ON public.diagrams
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create diagrams" ON public.diagrams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update diagrams" ON public.diagrams
  FOR UPDATE USING (true);

CREATE POLICY "authenticated can receive broadcasts" ON realtime.messages
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "authenticated can send broadcasts" ON realtime.messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
