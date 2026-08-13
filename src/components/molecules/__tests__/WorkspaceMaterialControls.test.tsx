import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceMaterialControls } from "@/components/molecules/WorkspaceMaterialControls";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

const OBJECT: WorkspaceObject = {
  id: "1",
  source: { kind: "primitive", shape: "cube" },
  url: "",
  transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  visible: true,
  wireframe: false,
};

describe("WorkspaceMaterialControls", () => {
  it("calls onUpdateMaterial with the new color (AC-9)", () => {
    const onUpdateMaterial = vi.fn();
    render(<WorkspaceMaterialControls object={OBJECT} onUpdateMaterial={onUpdateMaterial} />);

    const colorInput = screen.getByLabelText("Object base color") as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: "#ff00ff" } });

    expect(onUpdateMaterial).toHaveBeenCalledWith("1", { color: "#ff00ff" });
  });

  it("rejects a non-image file with an inline error, without calling onUpdateMaterial (A-7)", async () => {
    const onUpdateMaterial = vi.fn();
    render(<WorkspaceMaterialControls object={OBJECT} onUpdateMaterial={onUpdateMaterial} />);

    // `user-event`'s `.upload()` silently skips a file that doesn't match the
    // input's `accept` attribute (the exact case under test), so the
    // rejection path is exercised via `fireEvent.change` directly instead.
    const file = new File(["not an image"], "doc.txt", { type: "text/plain" });
    const fileInput = screen.getByLabelText("Texture file");
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("doc.txt is not an image file.");
    expect(onUpdateMaterial).not.toHaveBeenCalled();
  });

  it("converts a valid image file to a data URL and applies it as the texture (AC-10)", async () => {
    const onUpdateMaterial = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceMaterialControls object={OBJECT} onUpdateMaterial={onUpdateMaterial} />);

    const file = new File(["fake-image-bytes"], "texture.png", { type: "image/png" });
    const fileInput = screen.getByLabelText("Texture file");
    await user.upload(fileInput, file);

    await waitFor(() =>
      expect(onUpdateMaterial).toHaveBeenCalledWith("1", { textureDataUrl: expect.stringContaining("data:") }),
    );
  });
});
