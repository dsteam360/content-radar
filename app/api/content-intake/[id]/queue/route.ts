import { NextResponse } from "next/server";
import {
  MissingContentWorkflowTablesError,
  createQueueItem,
} from "@/app/lib/content-intake-server";
import { hasSupabaseAdminEnv } from "@/app/lib/env";
import type { TargetPlatform } from "@/app/lib/content-intake";

type QueueIntakeRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: QueueIntakeRouteContext) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json(
        { error: "Content workflow persistence is not configured yet." },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      targetPlatforms?: TargetPlatform[];
    };
    const queueItem = await createQueueItem({
      intakeItemId: id,
      targetPlatforms: body.targetPlatforms,
    });

    return NextResponse.json({ queueItem });
  } catch (error) {
    if (error instanceof MissingContentWorkflowTablesError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error("Queue content intake route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to queue intake item.",
      },
      { status: 500 }
    );
  }
}
