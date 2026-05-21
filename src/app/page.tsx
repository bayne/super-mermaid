"use client";

import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";

export default function Home() {
  const router = useRouter();

  function handleNewDiagram() {
    const id = nanoid(10);
    router.push(`/d/${id}`);
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Super Mermaid</h1>
        <p className="mt-2 text-lg text-gray-500">
          Collaborative Mermaid.js diagram editor
        </p>
      </div>
      <button
        onClick={handleNewDiagram}
        className="rounded-lg bg-foreground px-6 py-3 text-lg font-medium text-background transition-opacity hover:opacity-80"
      >
        New Diagram
      </button>
    </div>
  );
}
