import { fetchRecentYoutubeVideosByHandle, YoutubeApiError } from "@/app/lib/youtube-api";
import {
  aggregateCreatorStats,
  getCreatorMomentumDelta,
  normalizeYoutubeHandle,
  type Creator,
  type CreatorAnalytics,
  type CreatorMomentumDelta,
  type Video,
} from "@/app/lib/youtube-insights";
import {
  type RadarHistoryView,
  type RadarSnapshotRunType,
  type RadarSnapshotStatus,
} from "@/app/lib/radar-history";
import {
  getRadarHistoryViewFromDatabase,
  persistRadarSnapshot,
} from "@/app/lib/radar-history-server";
import { createSupabaseAdminClient } from "@/app/lib/supabase-server";

export type CreatorRefreshOutcome = {
  creator: Creator;
  videos: Video[];
  analytics: CreatorAnalytics;
  momentum: CreatorMomentumDelta;
  fetchStatus: "success" | "failed";
  errorMessage?: string;
};

export type RadarRefreshResult = {
  runType: RadarSnapshotRunType;
  status: RadarSnapshotStatus;
  trackedCreatorCount: number;
  activeCreatorCount: number;
  successfulCreatorCount: number;
  failureCount: number;
  videoCount: number;
  persisted: boolean;
  persistedSnapshotId: string | null;
  creators: Array<{
    creatorId: number;
    creatorName: string;
    fetchStatus: "success" | "failed";
    videosAnalyzed: number;
    errorMessage?: string;
  }>;
  breakoutPosts: Record<number, Video[]>;
  history: RadarHistoryView | null;
};

async function getTrackedYoutubeCreators() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((creator) => {
    return (
      creator.platform?.toLowerCase() === "youtube" &&
      normalizeYoutubeHandle(creator.youtube_handle ?? "")
    );
  }) as Creator[];
}

function buildEmptyAnalytics(): CreatorAnalytics {
  return aggregateCreatorStats([]);
}

function buildEmptyMomentum(): CreatorMomentumDelta {
  return getCreatorMomentumDelta([]);
}

export async function executeRadarRefresh(
  runType: RadarSnapshotRunType
): Promise<RadarRefreshResult> {
  const creators = await getTrackedYoutubeCreators();
  const creatorOutcomes = await Promise.all(
    creators.map(async (creator) => {
      const normalizedHandle = normalizeYoutubeHandle(creator.youtube_handle ?? "");

      if (!normalizedHandle) {
        return {
          creator,
          videos: [],
          analytics: buildEmptyAnalytics(),
          momentum: buildEmptyMomentum(),
          fetchStatus: "failed" as const,
          errorMessage: "Creator is missing a usable YouTube handle.",
        };
      }

      try {
        const result = await fetchRecentYoutubeVideosByHandle(normalizedHandle);
        const analytics = aggregateCreatorStats(result.videos);
        const momentum = getCreatorMomentumDelta(result.videos);

        return {
          creator,
          videos: result.videos,
          analytics,
          momentum,
          fetchStatus: "success" as const,
        };
      } catch (error) {
        return {
          creator,
          videos: [],
          analytics: buildEmptyAnalytics(),
          momentum: buildEmptyMomentum(),
          fetchStatus: "failed" as const,
          errorMessage:
            error instanceof YoutubeApiError || error instanceof Error
              ? error.message
              : "Unexpected YouTube refresh failure.",
        };
      }
    })
  );

  const activeCreatorCount = creatorOutcomes.filter(
    (outcome) => outcome.videos.length > 0
  ).length;
  const failureCount = creatorOutcomes.filter(
    (outcome) => outcome.fetchStatus === "failed"
  ).length;
  const successfulCreatorCount = creatorOutcomes.filter(
    (outcome) => outcome.fetchStatus === "success"
  ).length;
  const videoCount = creatorOutcomes.reduce((sum, outcome) => sum + outcome.videos.length, 0);
  const status: RadarSnapshotStatus =
    failureCount === 0
      ? "success"
      : successfulCreatorCount === 0
        ? "failed"
        : "partial";

  const persistedSnapshot = await persistRadarSnapshot({
    runType,
    status,
    creators,
    creatorSnapshots: creatorOutcomes,
  });
  const history = await getRadarHistoryViewFromDatabase();

  return {
    runType,
    status,
    trackedCreatorCount: creators.length,
    activeCreatorCount,
    successfulCreatorCount,
    failureCount,
    videoCount,
    persisted: true,
    persistedSnapshotId: persistedSnapshot.id,
    creators: creatorOutcomes.map((outcome) => ({
      creatorId: outcome.creator.id,
      creatorName: outcome.creator.name,
      fetchStatus: outcome.fetchStatus,
      videosAnalyzed: outcome.analytics.totalVideos,
      errorMessage: outcome.errorMessage,
    })),
    breakoutPosts: Object.fromEntries(
      creatorOutcomes.map((outcome) => [outcome.creator.id, outcome.videos])
    ),
    history,
  };
}
