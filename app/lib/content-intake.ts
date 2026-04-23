export type SourcePlatform =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "x"
  | "facebook"
  | "unknown";

export type IntakeStatus = "new" | "analyzed" | "queued" | "archived" | "failed";

export type QueueStatus = "idea" | "drafting" | "ready" | "posted" | "archived";

export type TargetPlatform =
  | "x"
  | "youtube_shorts"
  | "instagram_reels"
  | "tiktok"
  | "facebook_video";

export type IntakeMetadata = {
  detectedPlatform: SourcePlatform;
  metadataStatus: "fetched" | "limited" | "failed";
  errorMessage?: string;
};

export type IntakeAnalysis = {
  whyInteresting: string;
  likelyWorkedBecause: string;
  primaryAngle: string;
  operatorNote: string;
};

export type RemixBrief = {
  originalReference: string;
  whyItWorks: string;
  remakeStrategy: string;
  whatToKeep: string[];
  whatToChange: string[];
  hookConcept: string;
  pacingRecommendation: string;
  emotionalTone: string;
  visualStyleNotes: string;
  editingNotes: string;
  captionAngle: string;
  ctaAngle: string;
};

export type MusicSignalProfile = {
  tone: "dark" | "emotional" | "hype" | "cinematic" | "aggressive" | "reflective" | "playful";
  pacing: "slow" | "medium" | "fast" | "escalating";
  energy: "low" | "medium" | "high";
  visualStyle: "gritty" | "polished" | "chaotic" | "aesthetic" | "cinematic" | "raw";
};

export type MusicRecommendation = {
  songTitle: string;
  artist: string;
  category: string;
  reason: string;
  eraTag: "newer" | "older" | "timeless";
  editUseNote: string;
  favorite?: boolean;
};

export type MusicSupervisorOutput = {
  profile: MusicSignalProfile;
  suggestions: MusicRecommendation[];
};

export type PublishAssistBlock = {
  platform: TargetPlatform;
  title: string;
  caption: string;
  hashtags: string[];
  cta: string;
  notes: string;
};

export type ContentIntakeItem = {
  id: string;
  source_url: string;
  source_platform: SourcePlatform;
  title: string | null;
  source_creator_name: string | null;
  thumbnail_url: string | null;
  status: IntakeStatus;
  notes: string | null;
  tags_json: string[];
  metadata_json: IntakeMetadata;
  analysis_json: Partial<IntakeAnalysis>;
  created_at: string;
  updated_at: string;
  analyzed_at: string | null;
};

export type ContentQueueItem = {
  id: string;
  intake_item_id: string;
  queue_status: QueueStatus;
  target_platforms_json: TargetPlatform[];
  remix_brief_json: Partial<RemixBrief>;
  music_supervisor_json: Partial<MusicSupervisorOutput>;
  publish_assist_json: PublishAssistBlock[];
  created_at: string;
  updated_at: string;
  intake_item?: ContentIntakeItem;
};

export type IntakeBoard = {
  intakeItems: ContentIntakeItem[];
  queueItems: ContentQueueItem[];
};

export const TARGET_PLATFORM_LABELS: Record<TargetPlatform, string> = {
  x: "X",
  youtube_shorts: "YouTube Shorts",
  instagram_reels: "Instagram Reels",
  tiktok: "TikTok",
  facebook_video: "Facebook Video",
};

export const QUEUE_STATUSES: QueueStatus[] = [
  "idea",
  "drafting",
  "ready",
  "posted",
  "archived",
];

export function normalizeTags(tags: string | string[] | undefined) {
  const rawTags = Array.isArray(tags) ? tags : tags?.split(",") ?? [];

  return Array.from(
    new Set(
      rawTags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12)
    )
  );
}

export function detectSourcePlatform(sourceUrl: string): SourcePlatform {
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return "youtube";
    }

    if (hostname.includes("instagram.com")) {
      return "instagram";
    }

    if (hostname.includes("tiktok.com")) {
      return "tiktok";
    }

    if (hostname === "x.com" || hostname.includes("twitter.com")) {
      return "x";
    }

    if (hostname.includes("facebook.com") || hostname.includes("fb.watch")) {
      return "facebook";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

export function normalizeSourceUrl(sourceUrl: string) {
  const trimmedUrl = sourceUrl.trim();
  const withProtocol = /^https?:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return new URL(withProtocol).toString();
}

export function createFallbackIntakeAnalysis(item: {
  title?: string | null;
  source_platform: SourcePlatform;
  notes?: string | null;
  tags_json?: string[];
}): IntakeAnalysis {
  const title = item.title || "Saved reference";
  const tags = item.tags_json?.length ? item.tags_json.join(", ") : "the visible format";

  return {
    whyInteresting: `${title} is worth studying because it was intentionally saved as a reference for ${item.source_platform} content.`,
    likelyWorkedBecause:
      "The concept likely has a clear hook, recognizable context, or repeatable structure that can be adapted without copying the original.",
    primaryAngle: `Use ${tags} as the starting point, then rebuild the idea around your own audience, offer, and visual language.`,
    operatorNote:
      item.notes ||
      "Add notes about the hook, pacing, comment response, or visual style before moving this into production.",
  };
}
