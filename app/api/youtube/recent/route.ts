import { NextResponse } from "next/server";
import { fetchRecentYoutubeVideosByHandle, YoutubeApiError } from "@/app/lib/youtube-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get("handle");

    if (!handle) {
      return NextResponse.json(
        { error: "Missing handle query param." },
        { status: 400 }
      );
    }

    const result = await fetchRecentYoutubeVideosByHandle(handle);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof YoutubeApiError) {
      return NextResponse.json(
        {
          error: error.message,
          operation: error.operation,
        },
        { status: error.status }
      );
    }

    console.error("YouTube route error:", error);

    return NextResponse.json(
      { error: "Unexpected server error during YouTube refresh." },
      { status: 500 }
    );
  }
}
