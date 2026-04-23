import {
  TARGET_PLATFORM_LABELS,
  type ContentIntakeItem,
  type MusicSupervisorOutput,
  type PublishAssistBlock,
  type RemixBrief,
  type TargetPlatform,
} from "@/app/lib/content-intake";

const DEFAULT_TARGET_PLATFORMS: TargetPlatform[] = [
  "x",
  "youtube_shorts",
  "instagram_reels",
  "tiktok",
  "facebook_video",
];

function buildHashtags(item: ContentIntakeItem, platform: TargetPlatform) {
  const baseTags = item.tags_json.slice(0, 4);
  const platformTags: Record<TargetPlatform, string[]> = {
    x: [],
    youtube_shorts: ["shorts"],
    instagram_reels: ["reels", "contentcreator"],
    tiktok: ["fyp", "creator"],
    facebook_video: ["video", "creator"],
  };

  return Array.from(new Set([...baseTags, ...platformTags[platform]])).slice(0, 6);
}

export function buildPublishAssistBlocks(input: {
  item: ContentIntakeItem;
  remixBrief: Partial<RemixBrief>;
  music?: Partial<MusicSupervisorOutput>;
  targetPlatforms?: TargetPlatform[];
}): PublishAssistBlock[] {
  const targetPlatforms = input.targetPlatforms?.length
    ? input.targetPlatforms
    : DEFAULT_TARGET_PLATFORMS;
  const hook = input.remixBrief.hookConcept || "A smarter way to think about this";
  const angle =
    input.remixBrief.captionAngle ||
    "Use the reference as inspiration, then make the lesson specific to your audience.";
  const cta = input.remixBrief.ctaAngle || "Save this for your next content planning session.";
  const musicTone = input.music?.profile?.tone
    ? `Music direction should feel ${input.music.profile.tone}.`
    : "Pick music that supports the hook without overpowering the message.";

  return targetPlatforms.map((platform) => {
    const label = TARGET_PLATFORM_LABELS[platform];
    const hashtags = buildHashtags(input.item, platform);

    return {
      platform,
      title:
        platform === "x"
          ? hook
          : `${hook} | ${label} idea`,
      caption:
        platform === "x"
          ? `${hook}\n\n${angle}\n\n${cta}`
          : `${hook}\n\n${angle}\n\n${cta}\n\n${hashtags
              .map((tag) => `#${tag.replace(/^#/, "")}`)
              .join(" ")}`,
      hashtags,
      cta,
      notes:
        platform === "youtube_shorts"
          ? `${musicTone} Keep the title direct and make the first 2 seconds visually obvious.`
          : platform === "tiktok"
            ? `${musicTone} Lead with curiosity and keep the caption conversational.`
            : platform === "instagram_reels"
              ? `${musicTone} Make the caption save-worthy and use clean visual proof.`
              : platform === "facebook_video"
                ? `${musicTone} Use a slightly clearer setup for a broader audience.`
                : `${musicTone} Compress the idea into one sharp takeaway.`,
    };
  });
}
