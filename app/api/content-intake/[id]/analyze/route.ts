import { NextResponse } from "next/server";
import {
  MissingContentWorkflowTablesError,
  analyzeIntakeItem,
} from "@/app/lib/content-intake-server";
import { hasSupabaseAdminEnv } from "@/app/lib/env";

type AnalyzeIntakeRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: AnalyzeIntakeRouteContext) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json(
        { error: "Content workflow persistence is not configured yet." },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const item = await analyzeIntakeItem(id);

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof MissingContentWorkflowTablesError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error("Analyze content intake route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze intake item.",
      },
      { status: 500 }
    );
  }
}
