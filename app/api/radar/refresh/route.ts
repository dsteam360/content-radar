import { NextResponse } from "next/server";
import { executeRadarRefresh } from "@/app/lib/radar-refresh";

export async function POST() {
  try {
    const result = await executeRadarRefresh("manual");

    return NextResponse.json({ refresh: result });
  } catch (error) {
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
