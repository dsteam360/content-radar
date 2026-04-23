import { NextResponse } from "next/server";
import {
  MissingContentWorkflowTablesError,
  refreshQueueItemPublishAssist,
} from "@/app/lib/content-intake-server";
import { hasSupabaseAdminEnv } from "@/app/lib/env";

type QueuePublishRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: QueuePublishRouteContext) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json(
        { error: "Content workflow persistence is not configured yet." },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const queueItem = await refreshQueueItemPublishAssist(id);

    return NextResponse.json({ queueItem });
  } catch (error) {
    if (error instanceof MissingContentWorkflowTablesError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error("Refresh queue publish route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to refresh publish assist blocks.",
      },
      { status: 500 }
    );
  }
}
