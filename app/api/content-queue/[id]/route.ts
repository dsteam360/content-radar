import { NextResponse } from "next/server";
import {
  MissingContentWorkflowTablesError,
  updateQueueItem,
} from "@/app/lib/content-intake-server";
import { hasSupabaseAdminEnv } from "@/app/lib/env";
import type {
  ContentQueueItem,
  QueueStatus,
  TargetPlatform,
} from "@/app/lib/content-intake";

type ContentQueueRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: ContentQueueRouteContext) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json(
        { error: "Content workflow persistence is not configured yet." },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      queueStatus?: QueueStatus;
      targetPlatforms?: TargetPlatform[];
    };
    const patch: Partial<
      Pick<ContentQueueItem, "queue_status" | "target_platforms_json">
    > = {};

    if (body.queueStatus) {
      patch.queue_status = body.queueStatus;
    }

    if (body.targetPlatforms) {
      patch.target_platforms_json = body.targetPlatforms;
    }

    const queueItem = await updateQueueItem(id, patch);

    return NextResponse.json({ queueItem });
  } catch (error) {
    if (error instanceof MissingContentWorkflowTablesError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error("Update content queue route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update queue item.",
      },
      { status: 500 }
    );
  }
}
