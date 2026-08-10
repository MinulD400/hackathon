import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AssetResultCard } from "@/components/molecules/AssetResultCard";
import type { ResolvedAsset } from "@/infrastructure/library/types";

const polyHavenAsset: ResolvedAsset = {
  id: "polyhaven:dirty_football",
  name: "Dirty Football",
  gltfUrl: "/api/assets/dirty_football/gltf",
  authors: { Someone: "artist" },
  source: "polyhaven",
};

const polyPizzaAsset: ResolvedAsset = {
  id: "polypizza:abc123",
  name: "Office Chair",
  gltfUrl: "https://static.poly.pizza/model.glb",
  authors: { Quaternius: "creator" },
  source: "polypizza",
  licence: "CC-BY 3.0",
  attribution: '"Office Chair" by Quaternius, https://poly.pizza/m/abc123',
};

describe("AssetResultCard", () => {
  it("shows an implicit CC0 credit for a Poly Haven asset with no licence field", () => {
    render(<AssetResultCard asset={polyHavenAsset} isImported={false} onChoose={vi.fn()} />);
    expect(screen.getByText("CC0 · by Someone")).toBeInTheDocument();
  });

  it("shows the asset's own licence for a Poly Pizza asset (NFR-4)", () => {
    render(<AssetResultCard asset={polyPizzaAsset} isImported={false} onChoose={vi.fn()} />);
    expect(screen.getByText("CC-BY 3.0 · by Quaternius")).toBeInTheDocument();
    expect(screen.queryByText("CC0 · by Quaternius")).not.toBeInTheDocument();
  });

  it("calls onChoose with the asset when clicked", async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(<AssetResultCard asset={polyPizzaAsset} isImported={false} onChoose={onChoose} />);

    await user.click(screen.getByRole("button"));

    expect(onChoose).toHaveBeenCalledWith(polyPizzaAsset);
  });

  it("marks an already-imported asset as Added", () => {
    render(<AssetResultCard asset={polyHavenAsset} isImported onChoose={vi.fn()} />);
    expect(screen.getByText("Added")).toBeInTheDocument();
  });
});
