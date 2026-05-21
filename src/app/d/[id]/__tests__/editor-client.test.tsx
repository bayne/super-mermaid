import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const stableUser = {
  userId: "test-user",
  name: "Test",
  color: "#E63946",
};

vi.mock("@/lib/user-identity", () => ({
  getUserIdentity: vi.fn(() => stableUser),
  updateUserIdentity: vi.fn(),
}));

vi.mock("@/hooks/use-realtime-channel", () => ({
  useRealtimeChannel: vi.fn(() => null),
}));

vi.mock("@/hooks/use-diagram-sync", () => ({
  useDiagramSync: vi.fn(() => ({
    content: "graph TD\n  A --> B",
    updateContent: vi.fn(),
    title: "Test Diagram",
    updateTitle: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-presence", () => ({
  usePresence: vi.fn(() => ({ onlineUsers: [] })),
}));

vi.mock("@/hooks/use-cursor-sync", () => ({
  useCursorSync: vi.fn(() => ({
    remoteCursors: new Map(),
    broadcastCursor: vi.fn(),
  })),
}));

vi.mock("@uiw/react-codemirror", () => {
  const { forwardRef } = require("react");
  return {
    __esModule: true,
    default: forwardRef(function MockCM(
      props: { value: string },
      ref: React.Ref<unknown>
    ) {
      if (ref && typeof ref === "object") {
        (ref as React.MutableRefObject<unknown>).current = {
          view: { dispatch: vi.fn() },
        };
      }
      return <textarea data-testid="editor" value={props.value} readOnly />;
    }),
  };
});

vi.mock("codemirror-lang-mermaid", () => ({
  mermaid: vi.fn(() => []),
}));

vi.mock("@/components/diagram-editor/remote-cursors", () => ({
  remoteCursorField: [],
  setRemoteCursors: { of: vi.fn() },
}));

vi.mock("@/lib/mermaid-renderer", () => ({
  renderMermaid: vi.fn().mockResolvedValue({ svg: "<svg>test</svg>", error: null }),
}));

import { EditorClient } from "../editor-client";
import { getUserIdentity } from "@/lib/user-identity";

describe("EditorClient", () => {
  it("renders nothing when user is null", () => {
    vi.mocked(getUserIdentity).mockReturnValue(null as never);
    const { container } = render(
      <EditorClient diagramId="test-id" defaultContent="default" />
    );
    expect(container.firstChild).toBeNull();
    // Restore stable user for other tests
    vi.mocked(getUserIdentity).mockReturnValue(stableUser);
  });
  it("renders toolbar with title", () => {
    render(<EditorClient diagramId="test-id" defaultContent="default" />);
    expect(screen.getByDisplayValue("Test Diagram")).toBeInTheDocument();
  });

  it("renders the editor", () => {
    render(<EditorClient diagramId="test-id" defaultContent="default" />);
    expect(screen.getByTestId("editor")).toBeInTheDocument();
  });

  it("renders app name in toolbar", () => {
    render(<EditorClient diagramId="test-id" defaultContent="default" />);
    expect(screen.getByText("Super Mermaid")).toBeInTheDocument();
  });

  it("renders user name button", () => {
    render(<EditorClient diagramId="test-id" defaultContent="default" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("renders share button", () => {
    render(<EditorClient diagramId="test-id" defaultContent="default" />);
    expect(screen.getByText("Share")).toBeInTheDocument();
  });
});
