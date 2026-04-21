import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getCronEnv, hasSupabaseAdminEnv } from "@/app/lib/env";
import { executeRadarRefresh } from "@/app/lib/radar-refresh";

function isAuthorized(request: Request) {
  const { cronSecret } = getCronEnv();
  const providedSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  const expected = Buffer.from(cronSecret);
  const provided = Buffer.from(providedSecret);

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

async function runScheduledRefresh(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Snapshot persistence is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY before running scheduled refreshes.",
        },
        { status: 503 }
      );
    }

    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await executeRadarRefresh("scheduled");

    return NextResponse.json({
      ok: true,
      refresh: {
        runType: result.runType,
        status: result.status,
        trackedCreatorCount: result.trackedCreatorCount,
        activeCreatorCount: result.activeCreatorCount,
        successfulCreatorCount: result.successfulCreatorCount,
        failureCount: result.failureCount,
        videoCount: result.videoCount,
        persistedSnapshotId: result.persistedSnapshotId,
      },
    });
  } catch (error) {
    console.error("Scheduled radar refresh route error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Scheduled radar refresh failed.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return runScheduledRefresh(request);
}

export async function POST(request: Request) {
  return runScheduledRefresh(request);
}
