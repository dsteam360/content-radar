import { NextResponse } from "next/server";
import { hasSupabaseAdminEnv } from "@/app/lib/env";
import { MissingSnapshotTablesError } from "@/app/lib/radar-history-server";
import { executeRadarRefresh } from "@/app/lib/radar-refresh";

export async function POST() {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json(
        {
          error:
            "Snapshot persistence is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY before running a persisted manual refresh.",
        },
        { status: 503 }
      );
    }

    const result = await executeRadarRefresh("manual");

    return NextResponse.json({ refresh: result });
  } catch (error) {
    if (error instanceof MissingSnapshotTablesError) {
      return NextResponse.json(
        {
          error:
            "Snapshot tables have not been created yet. Run the Supabase migration before using persisted refresh.",
        },
        { status: 503 }
      );
    }

    console.error("Manual radar refresh route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Manual radar refresh failed.",
      },
      { status: 500 }
    );
  }
}
