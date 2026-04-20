import {
  type CreatorSnapshotMetadata,
  type CreatorSnapshotRecord,
  type RadarHistoryView,
  type RadarSnapshotRecord,
  type RadarSnapshotRunType,
  type RadarSnapshotStatus,
  buildRadarHistoryView,
  buildRadarSnapshotSummary,
} from "@/app/lib/radar-history";
import { createSupabaseAdminClient } from "@/app/lib/supabase-server";
import type { Creator, CreatorAnalytics, CreatorMomentumDelta, Video } from "@/app/lib/youtube-insights";
import { getBenchmarkSummary } from "@/app/lib/youtube-insights";

type PersistedCreatorSnapshotInput = {
  creator: Creator;
  videos: Video[];
  analytics: CreatorAnalytics;
  momentum: CreatorMomentumDelta;
  fetchStatus: CreatorSnapshotMetadata["fetchStatus"];
  errorMessage?: string;
};

type PersistRadarSnapshotInput = {
  runType: RadarSnapshotRunType;
  status: RadarSnapshotStatus;
  creators: Creator[];
  creatorSnapshots: PersistedCreatorSnapshotInput[];
};

function toRadarSnapshotRecord(row: Record<string, unknown>): RadarSnapshotRecord {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    platform: String(row.platform ?? "youtube"),
    creator_count: Number(row.creator_count ?? 0),
    video_count: Number(row.video_count ?? 0),
    run_type: row.run_type as RadarSnapshotRunType,
    status: row.status as RadarSnapshotStatus,
    summary_json:
      row.summary_json && typeof row.summary_json === "object"
        ? (row.summary_json as RadarSnapshotRecord["summary_json"])
        : null,
  };
}

function toCreatorSnapshotRecord(
  row: Record<string, unknown>
): CreatorSnapshotRecord {
  return {
    id: String(row.id),
    radar_snapshot_id: String(row.radar_snapshot_id),
    creator_id:
      typeof row.creator_id === "number" ? row.creator_id : row.creator_id ? Number(row.creator_id) : null,
    creator_name: String(row.creator_name ?? "Unknown creator"),
    platform: String(row.platform ?? "youtube"),
    videos_analyzed: Number(row.videos_analyzed ?? 0),
    total_recent_views: Number(row.total_recent_views ?? 0),
    average_breakout_score: Number(row.average_breakout_score ?? 0),
    breakout_rate: Number(row.breakout_rate ?? 0),
    avg_views_per_hour: Number(row.avg_views_per_hour ?? 0),
    avg_engagement_rate: Number(row.avg_engagement_rate ?? 0),
    top_video_breakout_score: Number(row.top_video_breakout_score ?? 0),
    consistency_score: Number(row.consistency_score ?? 0),
    momentum_label:
      (row.momentum_label as CreatorSnapshotRecord["momentum_label"]) ?? "Stable",
    metadata_json:
      row.metadata_json && typeof row.metadata_json === "object"
        ? (row.metadata_json as CreatorSnapshotMetadata)
        : null,
  };
}

export async function persistRadarSnapshot({
  runType,
  status,
  creators,
  creatorSnapshots,
}: PersistRadarSnapshotInput) {
  const supabase = createSupabaseAdminClient();
  const allVideos = creatorSnapshots.flatMap((snapshot) => snapshot.videos);
  const benchmarkSummary = getBenchmarkSummary(allVideos);
  const averageBreakoutScore =
    allVideos.length > 0
      ? Math.round(
          allVideos.reduce((sum, video) => sum + (video.breakoutScore ?? 0), 0) /
            allVideos.length
        )
      : 0;
  const activeCreatorCount = creatorSnapshots.filter(
    (snapshot) => snapshot.videos.length > 0
  ).length;
  const failureCount = creatorSnapshots.filter(
    (snapshot) => snapshot.fetchStatus === "failed"
  ).length;
  const successfulCreatorCount = creatorSnapshots.filter(
    (snapshot) => snapshot.fetchStatus === "success"
  ).length;

  const summaryJson = buildRadarSnapshotSummary({
    trackedCreatorCount: creators.length,
    activeCreatorCount,
    averageBreakoutScore,
    medianViews: benchmarkSummary.medianViews,
    medianViewsPerHour: benchmarkSummary.medianViewsPerHour,
    failureCount,
    successfulCreatorCount,
  });

  const { data: snapshotRow, error: snapshotError } = await supabase
    .from("radar_snapshots")
    .insert({
      platform: "youtube",
      creator_count: creators.length,
      video_count: allVideos.length,
      run_type: runType,
      status,
      summary_json: summaryJson,
    })
    .select("*")
    .single();

  if (snapshotError || !snapshotRow) {
    throw new Error(snapshotError?.message || "Failed to persist radar snapshot.");
  }

  const creatorRows = creatorSnapshots.map((snapshot) => ({
    radar_snapshot_id: snapshotRow.id,
    creator_id: snapshot.creator.id,
    creator_name: snapshot.creator.name,
    platform: snapshot.creator.platform,
    videos_analyzed: snapshot.analytics.totalVideos,
    total_recent_views: snapshot.analytics.totalRecentViews,
    average_breakout_score: snapshot.analytics.avgBreakoutScore,
    breakout_rate: snapshot.analytics.breakoutRate,
    avg_views_per_hour: snapshot.analytics.avgViewsPerHour,
    avg_engagement_rate: snapshot.analytics.avgEngagementRate,
    top_video_breakout_score: snapshot.analytics.topVideoBreakoutScore,
    consistency_score: snapshot.analytics.consistencyScore,
    momentum_label: snapshot.momentum.momentumLabel,
    metadata_json: {
      fetchStatus: snapshot.fetchStatus,
      errorMessage: snapshot.errorMessage,
      breakoutDelta: snapshot.momentum.breakoutDelta,
      viewsPerHourDelta: snapshot.momentum.viewsPerHourDelta,
      engagementDelta: snapshot.momentum.engagementDelta,
    } satisfies CreatorSnapshotMetadata,
  }));

  const videoRows = creatorSnapshots.flatMap((snapshot) =>
    snapshot.videos.map((video) => ({
      radar_snapshot_id: snapshotRow.id,
      creator_id: snapshot.creator.id,
      youtube_video_id: video.id,
      title: video.title,
      channel_title: video.channelTitle,
      published_at: video.publishedAt,
      thumbnail: video.thumbnail,
      view_count: video.viewCount ?? 0,
      like_count: video.likeCount ?? 0,
      comment_count: video.commentCount ?? 0,
      breakout_score: video.breakoutScore,
      breakout_reason: video.breakoutReason,
      current_timestamp: video.currentTimestamp
        ? new Date(video.currentTimestamp).toISOString()
        : new Date().toISOString(),
    }))
  );

  const { error: creatorSnapshotError } = await supabase
    .from("creator_snapshots")
    .insert(creatorRows);

  if (creatorSnapshotError) {
    await supabase.from("radar_snapshots").delete().eq("id", snapshotRow.id);
    throw new Error(creatorSnapshotError.message);
  }

  if (videoRows.length > 0) {
    const { error: videoSnapshotError } = await supabase
      .from("video_snapshots")
      .insert(videoRows);

    if (videoSnapshotError) {
      await supabase.from("creator_snapshots").delete().eq("radar_snapshot_id", snapshotRow.id);
      await supabase.from("radar_snapshots").delete().eq("id", snapshotRow.id);
      throw new Error(videoSnapshotError.message);
    }
  }

  return toRadarSnapshotRecord(snapshotRow);
}

export async function getRadarHistoryViewFromDatabase(): Promise<RadarHistoryView> {
  const supabase = createSupabaseAdminClient();
  const { data: snapshotRows, error: snapshotError } = await supabase
    .from("radar_snapshots")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (snapshotError) {
    throw new Error(snapshotError.message);
  }

  const snapshots = (snapshotRows ?? []).map((row) =>
    toRadarSnapshotRecord(row as Record<string, unknown>)
  );
  const comparableSnapshotIds = snapshots
    .filter((snapshot) => snapshot.status !== "failed")
    .slice(0, 2)
    .map((snapshot) => snapshot.id);

  if (comparableSnapshotIds.length === 0) {
    return buildRadarHistoryView({
      snapshots,
      creatorSnapshots: [],
    });
  }

  const { data: creatorSnapshotRows, error: creatorSnapshotError } = await supabase
    .from("creator_snapshots")
    .select("*")
    .in("radar_snapshot_id", comparableSnapshotIds);

  if (creatorSnapshotError) {
    throw new Error(creatorSnapshotError.message);
  }

  return buildRadarHistoryView({
    snapshots,
    creatorSnapshots: (creatorSnapshotRows ?? []).map((row) =>
      toCreatorSnapshotRecord(row as Record<string, unknown>)
    ),
  });
}
