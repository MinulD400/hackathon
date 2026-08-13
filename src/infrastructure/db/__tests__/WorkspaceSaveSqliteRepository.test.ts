import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { WorkspaceSave } from "@/domain/workspace-save/WorkspaceSave";
import { WorkspaceSaveSqliteRepository } from "@/infrastructure/db/WorkspaceSaveSqliteRepository";
import { runMigrations } from "@/infrastructure/db/sqlite/migrate";

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

describe("WorkspaceSaveSqliteRepository", () => {
  let db: Database.Database;
  let repository: WorkspaceSaveSqliteRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    runMigrations(db);
    repository = new WorkspaceSaveSqliteRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates and re-reads a save by id, round-tripping objects/lights intact (AC-1, AC-4)", async () => {
    const save = WorkspaceSave.createNew({
      id: "save-1",
      name: "My Scene",
      objects: [
        { id: "o-1", source: { kind: "primitive", shape: "cube" }, transform: IDENTITY, visible: true, wireframe: false },
      ],
      lights: [
        { id: "l-1", type: "point", color: "#ffffff", intensity: 5, castShadow: false, position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
      ],
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    await repository.create(save);
    const found = await repository.findById("save-1");

    expect(found).not.toBeNull();
    expect(found?.toProps()).toEqual(save.toProps());
  });

  it("returns null for an unknown id (AC-12)", async () => {
    expect(await repository.findById("does-not-exist")).toBeNull();
  });

  it("lists all saves newest first (AC-4)", async () => {
    const earlier = WorkspaceSave.createNew({ id: "save-older", name: "Older", objects: [], lights: [], now: new Date("2026-01-01T00:00:00.000Z") });
    const later = WorkspaceSave.createNew({ id: "save-newer", name: "Newer", objects: [], lights: [], now: new Date("2026-01-02T00:00:00.000Z") });

    await repository.create(earlier);
    await repository.create(later);

    const saves = await repository.listAll();
    expect(saves.map((save) => save.id)).toEqual(["save-newer", "save-older"]);
  });

  it("deletes a save so a subsequent findById returns null (AC-12, AC-13)", async () => {
    const save = WorkspaceSave.createNew({ id: "save-1", name: "Scene", objects: [], lights: [], now: new Date() });
    await repository.create(save);

    await repository.delete("save-1");

    expect(await repository.findById("save-1")).toBeNull();
  });

  it("allows two saves with the same name to coexist independently (AC-13)", async () => {
    const first = WorkspaceSave.createNew({ id: "save-1", name: "Duplicate Name", objects: [], lights: [], now: new Date("2026-01-01T00:00:00.000Z") });
    const second = WorkspaceSave.createNew({ id: "save-2", name: "Duplicate Name", objects: [], lights: [], now: new Date("2026-01-02T00:00:00.000Z") });

    await repository.create(first);
    await repository.create(second);

    const saves = await repository.listAll();
    expect(saves).toHaveLength(2);
    expect(saves.map((save) => save.id).sort()).toEqual(["save-1", "save-2"]);
  });
});
