import { NextResponse } from "next/server";

import { GetGenerationJob } from "@/application/generation-job/use-cases/GetGenerationJob";
import { NotFoundError } from "@/application/generation-job/validation/errors";
import { getDb } from "@/infrastructure/db/sqlite/client";
import { GenerationJobSqliteRepository } from "@/infrastructure/db/GenerationJobSqliteRepository";

/** `GET /api/jobs/{id}` — a single job's current status/details (FR-8, AC-7). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const repository = new GenerationJobSqliteRepository(await getDb());
    const getGenerationJob = new GetGenerationJob(repository);
    const job = await getGenerationJob.execute(id);
    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ code: "NOT_FOUND", message: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
