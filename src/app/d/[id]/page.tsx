import { EditorClient } from "./editor-client";

interface Props {
  params: Promise<{ id: string }>;
}

const DEFAULT_CONTENT = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Do something]
  B -->|No| D[Do something else]
  C --> E[End]
  D --> E`;

export default async function DiagramPage({ params }: Props) {
  const { id } = await params;

  return <EditorClient diagramId={id} defaultContent={DEFAULT_CONTENT} />;
}
