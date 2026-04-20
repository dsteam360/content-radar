import { NextResponse } from "next/server";
import { hasSupabaseAdminEnv } from "@/app/lib/env";
import { getEmptyRadarHistoryView } from "@/app/lib/radar-history";
import { getRadarHistoryViewFromDatabase } from "@/app/lib/radar-history-server";

export async function GET() {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({
        history: getEmptyRadarHistoryView(
          "Snapshot persistence is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY to enable stored history and trend comparisons."
        ),
      });
    }

    const history = await getRadarHistoryViewFromDatabase();

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Radar history route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load radar history.",
      },
      { status: 500 }
    );
  }
}
