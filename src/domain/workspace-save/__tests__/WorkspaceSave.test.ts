import { describe, expect, it } from "vitest";

import { DomainError } from "@/domain/workspace-save/DomainError";
import { WorkspaceSave } from "@/domain/workspace-save/WorkspaceSave";

describe("WorkspaceSave", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("creates a new save, trimming the name, with the given objects/lights (AC-1)", () => {
    const save = WorkspaceSave.createNew({
      id: "save-1",
      name: "  My Scene  ",
      objects: [],
      lights: [],
      now,
    });

    const props = save.toProps();
    expect(props.name).toBe("My Scene");
    expect(props.objects).toEqual([]);
    expect(props.lights).toEqual([]);
    expect(props.createdAt).toEqual(now);
  });

  it("throws a DomainError when the name is empty or whitespace-only (AC-15)", () => {
    expect(() =>
      WorkspaceSave.createNew({ id: "save-1", name: "   ", objects: [], lights: [], now }),
    ).toThrow(DomainError);
  });

  it("throws a DomainError when the trimmed name exceeds 50 characters (AC-15)", () => {
    const tooLong = "a".repeat(51);
    expect(() =>
      WorkspaceSave.createNew({ id: "save-1", name: tooLong, objects: [], lights: [], now }),
    ).toThrow(DomainError);
  });

  it("accepts a name at exactly the 50-character boundary (AC-15 edge case)", () => {
    const exactly50 = "a".repeat(50);
    expect(() =>
      WorkspaceSave.createNew({ id: "save-1", name: exactly50, objects: [], lights: [], now }),
    ).not.toThrow();
  });

  it("fromProps round-trips props unchanged (AC-13)", () => {
    const props = {
      id: "save-1",
      name: "Scene A",
      objects: [],
      lights: [],
      createdAt: now,
    };
    const save = WorkspaceSave.fromProps(props);
    expect(save.toProps()).toEqual(props);
    expect(save.id).toBe("save-1");
  });
});
