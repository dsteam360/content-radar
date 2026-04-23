import {
  createFallbackIntakeAnalysis,
  detectSourcePlatform,
  normalizeSourceUrl,
  normalizeTags,
  type ContentIntakeItem,
  type ContentQueueItem,
  type IntakeMetadata,
  type IntakeStatus,
  type QueueStatus,
  type TargetPlatform,
} from "@/app/lib/content-intake";
import { getMusicSupervisorRecommendations } from "@/app/lib/music-supervisor";
import { buildPublishAssistBlocks } from "@/app/lib/publish-assist";
import { buildRemixBrief } from "@/app/lib/remix-engine";
import { createSupabaseAdminClient } from "@/app/lib/supabase-server";

type CreateIntakeInput = {
  sourceUrl: string;
  notes?: string;
  tags?: string | string[];
};

type UpdateIntakeInput = {
  status?: IntakeStatus;
  notes?: string;
  tags?: string | string[];
};

type CreateQueueInput = {
  intakeItemId: string;
  targetPlatforms?: TargetPlatform[];
};

type SupabaseMissingPhase3TablesErrorOptions = {
  message?: string;
};

export class MissingContentWorkflowTablesError extends Error {
  constructor(options: SupabaseMissingPhase3TablesErrorOptions = {}) {
    super(
      options.message ||
        "Content intake tables have not been created yet. Run the Phase 3 Supabase migration."
    );
    this.name = "MissingContentWorkflowTablesError";
  }
}

function isMissingPhase3TableError(error: { message?: string; code?: string }) {
  return (
    error.code === "PGRST205" ||
    error.message?.includes("content_intake_items") ||
    error.message?.includes("content_queue_items") ||
    error.message?.includes("schema cache")
  );
}

function normalizeSupabaseError(error: { message?: string; code?: string }) {
  if (isMissingPhase3TableError(error)) {
    throw new MissingContentWorkflowTablesError({ message: error.message });
  }

  throw new Error(error.message || "Content workflow request failed.");
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toIntakeItem(row: Record<string, unknown>): ContentIntakeItem {
  return {
    id: String(row.id),
    source_url: String(row.source_url),
    source_platform: row.source_platform as ContentIntakeItem["source_platform"],
    title: row.title ? String(row.title) : null,
    source_creator_name: row.source_creator_name
      ? String(row.source_creator_name)
      : null,
    thumbnail_url: row.thumbnail_url ? String(row.thumbnail_url) : null,
    status: row.status as ContentIntakeItem["status"],
    notes: row.notes ? String(row.notes) : null,
    tags_json: toStringArray(row.tags_json),
    metadata_json: (row.metadata_json ?? {}) as ContentIntakeItem["metadata_json"],
    analysis_json: (row.analysis_json ?? {}) as ContentIntakeItem["analysis_json"],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    analyzed_at: row.analyzed_at ? String(row.analyzed_at) : null,
  };
}

function toQueueItem(row: Record<string, unknown>): ContentQueueItem {
  return {
    id: String(row.id),
    intake_item_id: String(row.intake_item_id),
    queue_status: row.queue_status as QueueStatus,
    target_platforms_json: toStringArray(row.target_platforms_json) as TargetPlatform[],
    remix_brief_json: (row.remix_brief_json ?? {}) as ContentQueueItem["remix_brief_json"],
    music_supervisor_json: (row.music_supervisor_json ??
      {}) as ContentQueueItem["music_supervisor_json"],
    publish_assist_json: Array.isArray(row.publish_assist_json)
      ? (row.publish_assist_json as ContentQueueItem["publish_assist_json"])
      : [],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    intake_item:
      row.intake_item && typeof row.intake_item === "object"
        ? toIntakeItem(row.intake_item as Record<string, unknown>)
        : undefined,
  };
}

async function fetchYoutubeOembed(sourceUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrl)}&format=json`,
      {
        cache: "no-store",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error("YouTube metadata is unavailable for this URL.");
    }

    return (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getSafeMetadata(sourceUrl: string, platform: ContentIntakeItem["source_platform"]) {
  const metadata: IntakeMetadata = {
    detectedPlatform: platform,
    metadataStatus: "limited",
  };

  if (platform !== "youtube") {
    return {
      title: null,
      sourceCreatorName: null,
      thumbnailUrl: null,
      metadata,
    };
  }

  try {
    const oembed = await fetchYoutubeOembed(sourceUrl);

    return {
      title: oembed.title ?? null,
      sourceCreatorName: oembed.author_name ?? null,
      thumbnailUrl: oembed.thumbnail_url ?? null,
      metadata: {
        ...metadata,
        metadataStatus: "fetched" as const,
      },
    };
  } catch (error) {
    return {
      title: null,
      sourceCreatorName: null,
      thumbnailUrl: null,
      metadata: {
        ...metadata,
        metadataStatus: "failed" as const,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Metadata could not be fetched.",
      },
    };
  }
}

export async function getIntakeBoard() {
  const supabase = createSupabaseAdminClient();
  const [{ data: intakeRows, error: intakeError }, { data: queueRows, error: queueError }] =
    await Promise.all([
      supabase
        .from("content_intake_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("content_queue_items")
        .select("*, intake_item:content_intake_items(*)")
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

  if (intakeError) {
    normalizeSupabaseError(intakeError);
  }

  if (queueError) {
    normalizeSupabaseError(queueError);
  }

  return {
    intakeItems: (intakeRows ?? []).map((row) =>
      toIntakeItem(row as Record<string, unknown>)
    ),
    queueItems: (queueRows ?? []).map((row) =>
      toQueueItem(row as Record<string, unknown>)
    ),
  };
}

export async function createIntakeItem(input: CreateIntakeInput) {
  const supabase = createSupabaseAdminClient();
  const sourceUrl = normalizeSourceUrl(input.sourceUrl);
  const sourcePlatform = detectSourcePlatform(sourceUrl);
  const metadata = await getSafeMetadata(sourceUrl, sourcePlatform);
  const tags = normalizeTags(input.tags);

  const { data, error } = await supabase
    .from("content_intake_items")
    .insert({
      source_url: sourceUrl,
      source_platform: sourcePlatform,
      title: metadata.title,
      source_creator_name: metadata.sourceCreatorName,
      thumbnail_url: metadata.thumbnailUrl,
      status: "new",
      notes: input.notes?.trim() || null,
      tags_json: tags,
      metadata_json: metadata.metadata,
      analysis_json: {},
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error) {
      normalizeSupabaseError(error);
    }

    throw new Error("Failed to save intake item.");
  }

  return toIntakeItem(data as Record<string, unknown>);
}

export async function updateIntakeItem(id: string, input: UpdateIntakeInput) {
  const supabase = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.status) {
    patch.status = input.status;
  }

  if (typeof input.notes === "string") {
    patch.notes = input.notes.trim() || null;
  }

  if (input.tags !== undefined) {
    patch.tags_json = normalizeTags(input.tags);
  }

  const { data, error } = await supabase
    .from("content_intake_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    if (error) {
      normalizeSupabaseError(error);
    }

    throw new Error("Failed to update intake item.");
  }

  return toIntakeItem(data as Record<string, unknown>);
}

export async function analyzeIntakeItem(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data: itemRow, error: itemError } = await supabase
    .from("content_intake_items")
    .select("*")
    .eq("id", id)
    .single();

  if (itemError || !itemRow) {
    if (itemError) {
      normalizeSupabaseError(itemError);
    }

    throw new Error("Unable to find intake item.");
  }

  const item = toIntakeItem(itemRow as Record<string, unknown>);
  const analysis = createFallbackIntakeAnalysis(item);

  const { data, error } = await supabase
    .from("content_intake_items")
    .update({
      status: "analyzed",
      analysis_json: analysis,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    if (error) {
      normalizeSupabaseError(error);
    }

    throw new Error("Failed to analyze intake item.");
  }

  return toIntakeItem(data as Record<string, unknown>);
}

export async function createQueueItem(input: CreateQueueInput) {
  const supabase = createSupabaseAdminClient();
  const { data: itemRow, error: itemError } = await supabase
    .from("content_intake_items")
    .select("*")
    .eq("id", input.intakeItemId)
    .single();

  if (itemError || !itemRow) {
    if (itemError) {
      normalizeSupabaseError(itemError);
    }

    throw new Error("Unable to find intake item.");
  }

  const item = toIntakeItem(itemRow as Record<string, unknown>);
  const analyzedItem =
    item.status === "analyzed" || item.status === "queued"
      ? item
      : await analyzeIntakeItem(input.intakeItemId);
  const remixBrief = buildRemixBrief(analyzedItem);
  const music = getMusicSupervisorRecommendations(analyzedItem, remixBrief);
  const publishAssist = buildPublishAssistBlocks({
    item: analyzedItem,
    remixBrief,
    music,
    targetPlatforms: input.targetPlatforms,
  });

  const { data: existingQueueItem } = await supabase
    .from("content_queue_items")
    .select("*")
    .eq("intake_item_id", input.intakeItemId)
    .maybeSingle();

  if (existingQueueItem) {
    return updateQueueItem(String(existingQueueItem.id), {
      remix_brief_json: remixBrief,
      music_supervisor_json: music,
      publish_assist_json: publishAssist,
      target_platforms_json: input.targetPlatforms,
    });
  }

  const { data, error } = await supabase
    .from("content_queue_items")
    .insert({
      intake_item_id: input.intakeItemId,
      queue_status: "idea",
      target_platforms_json: input.targetPlatforms ?? [
        "x",
        "youtube_shorts",
        "instagram_reels",
        "tiktok",
        "facebook_video",
      ],
      remix_brief_json: remixBrief,
      music_supervisor_json: music,
      publish_assist_json: publishAssist,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error) {
      normalizeSupabaseError(error);
    }

    throw new Error("Failed to queue intake item.");
  }

  await supabase
    .from("content_intake_items")
    .update({
      status: "queued",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.intakeItemId);

  return toQueueItem(data as Record<string, unknown>);
}

export async function updateQueueItem(
  id: string,
  patch: Partial<Pick<ContentQueueItem, "queue_status" | "target_platforms_json" | "remix_brief_json" | "music_supervisor_json" | "publish_assist_json">>
) {
  const supabase = createSupabaseAdminClient();
  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  );
  const { data, error } = await supabase
    .from("content_queue_items")
    .update({
      ...cleanPatch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, intake_item:content_intake_items(*)")
    .single();

  if (error || !data) {
    if (error) {
      normalizeSupabaseError(error);
    }

    throw new Error("Failed to update queue item.");
  }

  return toQueueItem(data as Record<string, unknown>);
}

export async function getQueueItem(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_queue_items")
    .select("*, intake_item:content_intake_items(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    if (error) {
      normalizeSupabaseError(error);
    }

    throw new Error("Unable to find queue item.");
  }

  return toQueueItem(data as Record<string, unknown>);
}

export async function refreshQueueItemMusic(id: string) {
  const queueItem = await getQueueItem(id);

  if (!queueItem.intake_item) {
    throw new Error("Queued item is missing its source intake record.");
  }

  const remixBrief = Object.keys(queueItem.remix_brief_json).length
    ? queueItem.remix_brief_json
    : buildRemixBrief(queueItem.intake_item);
  const music = getMusicSupervisorRecommendations(queueItem.intake_item, remixBrief);

  return updateQueueItem(id, {
    remix_brief_json: remixBrief,
    music_supervisor_json: music,
  });
}

export async function refreshQueueItemPublishAssist(id: string) {
  const queueItem = await getQueueItem(id);

  if (!queueItem.intake_item) {
    throw new Error("Queued item is missing its source intake record.");
  }

  const remixBrief = Object.keys(queueItem.remix_brief_json).length
    ? queueItem.remix_brief_json
    : buildRemixBrief(queueItem.intake_item);
  const music = Object.keys(queueItem.music_supervisor_json).length
    ? queueItem.music_supervisor_json
    : getMusicSupervisorRecommendations(queueItem.intake_item, remixBrief);
  const publishAssist = buildPublishAssistBlocks({
    item: queueItem.intake_item,
    remixBrief,
    music,
    targetPlatforms: queueItem.target_platforms_json,
  });

  return updateQueueItem(id, {
    remix_brief_json: remixBrief,
    music_supervisor_json: music,
    publish_assist_json: publishAssist,
  });
}
