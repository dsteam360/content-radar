import { NextResponse } from "next/server";
import {
  MissingContentWorkflowTablesError,
  createIntakeItem,
  getIntakeBoard,
} from "@/app/lib/content-intake-server";
import { hasSupabaseAdminEnv } from "@/app/lib/env";

function getWorkflowUnavailableResponse(error?: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Content workflow persistence is not configured yet.",
    },
    { status: 503 }
  );
}

export async function GET() {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ board: { intakeItems: [], queueItems: [] } });
    }

    const board = await getIntakeBoard();

    return NextResponse.json({ board });
  } catch (error) {
    if (error instanceof MissingContentWorkflowTablesError) {
      return NextResponse.json({ board: { intakeItems: [], queueItems: [] } });
    }

    console.error("Content intake board route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load content intake board.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return getWorkflowUnavailableResponse(
        new Error(
          "Content workflow persistence is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY before saving intake links."
        )
      );
    }

    const body = (await request.json()) as {
      sourceUrl?: string;
      notes?: string;
      tags?: string | string[];
    };

    if (!body.sourceUrl?.trim()) {
      return NextResponse.json(
        { error: "Paste a source URL before saving an intake item." },
        { status: 400 }
      );
    }

    const item = await createIntakeItem({
      sourceUrl: body.sourceUrl,
      notes: body.notes,
      tags: body.tags,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof MissingContentWorkflowTablesError) {
      return getWorkflowUnavailableResponse(error);
    }

    console.error("Create content intake route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save content intake item.",
      },
      { status: 500 }
    );
  }
}
