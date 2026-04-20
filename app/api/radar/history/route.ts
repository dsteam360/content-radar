import { NextResponse } from "next/server";
import { getRadarHistoryViewFromDatabase } from "@/app/lib/radar-history-server";

export async function GET() {
  try {
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
