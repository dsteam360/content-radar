import { NextResponse } from "next/server";
import {
  MissingContentWorkflowTablesError,
  updateIntakeItem,
} from "@/app/lib/content-intake-server";
import { hasSupabaseAdminEnv } from "@/app/lib/env";
import type { IntakeStatus } from "@/app/lib/content-intake";

type ContentIntakeRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: ContentIntakeRouteContext) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json(
        { error: "Content workflow persistence is not configured yet." },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: IntakeStatus;
      notes?: string;
      tags?: string | string[];
    };
    const item = await updateIntakeItem(id, {
      status: body.status,
      notes: body.notes,
      tags: body.tags,
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof MissingContentWorkflowTablesError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error("Update content intake route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update intake item.",
      },
      { status: 500 }
    );
  }
}
