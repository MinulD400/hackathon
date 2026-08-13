import { DomainError } from "@/domain/workspace-save/DomainError";
import type { WorkspaceSaveLightSnapshot } from "@/domain/workspace-save/WorkspaceSaveLightSnapshot";
import type { WorkspaceSaveObjectSnapshot } from "@/domain/workspace-save/WorkspaceSaveObjectSnapshot";

export interface WorkspaceSaveProps {
  id: string;
  name: string;
  objects: WorkspaceSaveObjectSnapshot[];
  lights: WorkspaceSaveLightSnapshot[];
  createdAt: Date;
}

export interface CreateWorkspaceSaveInput {
  id: string;
  name: string;
  objects: WorkspaceSaveObjectSnapshot[];
  lights: WorkspaceSaveLightSnapshot[];
  now: Date;
}

/**
 * Domain entity for a single saved workspace snapshot (FR-1). Pure TS, no
 * framework/HTTP/DB imports — mirrors `GenerationJob.ts` (targets AC-1,
 * AC-13, AC-15).
 */
export class WorkspaceSave {
  private constructor(private readonly props: WorkspaceSaveProps) {}

  static createNew(input: CreateWorkspaceSaveInput): WorkspaceSave {
    const trimmed = input.name.trim();
    if (trimmed.length === 0) {
      throw new DomainError("A saved workspace name must not be empty.");
    }
    if (trimmed.length > 50) {
      throw new DomainError("A saved workspace name must not exceed 50 characters.");
    }
    return new WorkspaceSave({
      id: input.id,
      name: trimmed,
      objects: input.objects,
      lights: input.lights,
      createdAt: input.now,
    });
  }

  static fromProps(props: WorkspaceSaveProps): WorkspaceSave {
    return new WorkspaceSave({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  toProps(): Readonly<WorkspaceSaveProps> {
    return { ...this.props };
  }
}
