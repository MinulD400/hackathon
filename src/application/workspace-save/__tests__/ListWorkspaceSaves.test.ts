import { describe, expect, it, vi } from "vitest";

import { WorkspaceSave } from "@/domain/workspace-save/WorkspaceSave";
import type { WorkspaceSaveRepository } from "@/application/workspace-save/ports/WorkspaceSaveRepository";
import { ListWorkspaceSaves } from "@/application/workspace-save/use-cases/ListWorkspaceSaves";

describe("ListWorkspaceSaves", () => {
  it("returns the repository's list-order (newest first) mapped to list-item DTOs (AC-4)", async () => {
    const saves = [
      WorkspaceSave.createNew({ id: "save-newer", name: "Newer", objects: [], lights: [], now: new Date("2026-01-02T00:00:00.000Z") }),
      WorkspaceSave.createNew({ id: "save-older", name: "Older", objects: [], lights: [], now: new Date("2026-01-01T00:00:00.000Z") }),
    ];
    const repository: WorkspaceSaveRepository = {
      create: vi.fn(async () => {}),
      findById: vi.fn(async () => null),
      listAll: vi.fn(async () => saves),
      delete: vi.fn(async () => {}),
    };

    const useCase = new ListWorkspaceSaves(repository);
    const result = await useCase.execute();

    expect(result.map((item) => item.id)).toEqual(["save-newer", "save-older"]);
    expect(result[0]).toEqual({ id: "save-newer", name: "Newer", createdAt: "2026-01-02T00:00:00.000Z" });
  });

  it("returns an empty list when no saves exist", async () => {
    const repository: WorkspaceSaveRepository = {
      create: vi.fn(async () => {}),
      findById: vi.fn(async () => null),
      listAll: vi.fn(async () => []),
      delete: vi.fn(async () => {}),
    };
    const useCase = new ListWorkspaceSaves(repository);
    expect(await useCase.execute()).toEqual([]);
  });
});
