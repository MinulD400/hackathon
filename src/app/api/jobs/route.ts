import { NextResponse } from "next/server";

import { ListGenerationJobs } from "@/application/generation-job/use-cases/ListGenerationJobs";
import { getDb } from "@/infrastructure/db/sqlite/client";
import { GenerationJobSqliteRepository } from "@/infrastructure/db/GenerationJobSqliteRepository";

/** `GET /api/jobs` — history list, newest first (FR-7, AC-6). */
export async function GET() {
  try {
    const repository = new GenerationJobSqliteRepository(await getDb());
    const listGenerationJobs = new ListGenerationJobs(repository);
    const items = await listGenerationJobs.execute();
    return NextResponse.json({ items, total: items.length });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
