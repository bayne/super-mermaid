"use client";

interface Props {
  svg: string;
  error: string | null;
}

export function PreviewPanel({ svg, error }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-4">
        {svg ? (
          <div
            className="flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          !error && (
            <div className="flex h-full items-center justify-center text-gray-400">
              Start typing to see your diagram
            </div>
          )
        )}
      </div>
      {error && (
        <div className="border-t border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
