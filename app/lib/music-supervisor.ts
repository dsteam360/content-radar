import type {
  ContentIntakeItem,
  MusicRecommendation,
  MusicSignalProfile,
  MusicSupervisorOutput,
  RemixBrief,
} from "@/app/lib/content-intake";

const MUSIC_CATALOG: MusicRecommendation[] = [
  {
    songTitle: "Mount Everest",
    artist: "Labrinth",
    category: "Viral / trending feel",
    reason: "Big vocal energy gives transformation edits an immediate lift.",
    eraTag: "timeless",
    editUseNote: "Use the first impact moment as the visual reveal.",
  },
  {
    songTitle: "Time",
    artist: "Hans Zimmer",
    category: "Cinematic",
    reason: "Slow-build tension supports story arcs and dramatic pivots.",
    eraTag: "timeless",
    editUseNote: "Let the build carry the first half, then cut on the swell.",
  },
  {
    songTitle: "Sweater Weather",
    artist: "The Neighbourhood",
    category: "Dark / moody",
    reason: "Moody texture works for reflective, aesthetic, and night-drive visuals.",
    eraTag: "older",
    editUseNote: "Hold shots longer and let the atmosphere breathe.",
  },
  {
    songTitle: "Can You Hear The Music",
    artist: "Ludwig Goransson",
    category: "Cinematic",
    reason: "Escalating movement makes abstract concepts feel important.",
    eraTag: "newer",
    editUseNote: "Use a slow build into a high-clarity payoff shot.",
  },
  {
    songTitle: "DNA.",
    artist: "Kendrick Lamar",
    category: "High energy / gym / aggressive",
    reason: "Aggressive rhythm gives fast edits and confidence pieces force.",
    eraTag: "timeless",
    editUseNote: "Cut hard on drums and avoid overloading captions.",
  },
  {
    songTitle: "Je te laisserai des mots",
    artist: "Patrick Watson",
    category: "Emotional",
    reason: "Soft emotional weight fits vulnerable stories and reflective reveals.",
    eraTag: "timeless",
    editUseNote: "Use gentle pacing and land the message in the final third.",
  },
  {
    songTitle: "Sunset Lover",
    artist: "Petit Biscuit",
    category: "Clean / luxury / aesthetic",
    reason: "Polished electronic texture supports clean product, travel, and lifestyle edits.",
    eraTag: "older",
    editUseNote: "Use smooth motion and minimal text overlays.",
  },
  {
    songTitle: "FE!N",
    artist: "Travis Scott",
    category: "Viral / trending feel",
    reason: "High-recognition energy can push bold, chaotic, or hype edits.",
    eraTag: "newer",
    editUseNote: "Use only where the visuals can match the aggression.",
  },
  {
    songTitle: "Experience",
    artist: "Ludovico Einaudi",
    category: "Emotional",
    reason: "Emotional piano build works for transformation and meaning-heavy content.",
    eraTag: "timeless",
    editUseNote: "Start quiet, reveal the shift when the arrangement opens.",
  },
  {
    songTitle: "Midnight City",
    artist: "M83",
    category: "Clean / luxury / aesthetic",
    reason: "Nostalgic drive supports polished aspirational edits.",
    eraTag: "older",
    editUseNote: "Pair with motion, city visuals, or lifestyle progression.",
  },
];

function textIncludes(value: string, terms: string[]) {
  const normalizedValue = value.toLowerCase();
  return terms.some((term) => normalizedValue.includes(term));
}

function getCategoryRank(category: string, preferredCategories: string[]) {
  const categoryIndex = preferredCategories.indexOf(category);

  return categoryIndex === -1 ? 99 : categoryIndex;
}

export function buildMusicSignalProfile(
  item: ContentIntakeItem,
  remixBrief?: Partial<RemixBrief>
): MusicSignalProfile {
  const signalText = [
    item.title,
    item.notes,
    item.tags_json.join(" "),
    remixBrief?.emotionalTone,
    remixBrief?.visualStyleNotes,
    remixBrief?.pacingRecommendation,
  ]
    .filter(Boolean)
    .join(" ");

  const aggressive = textIncludes(signalText, ["gym", "aggressive", "hype", "challenge", "discipline"]);
  const emotional = textIncludes(signalText, ["emotional", "reflective", "story", "journey", "vulnerable"]);
  const aesthetic = textIncludes(signalText, ["luxury", "clean", "aesthetic", "polished", "product"]);
  const cinematic = textIncludes(signalText, ["cinematic", "dramatic", "transformation", "reveal"]);

  return {
    tone: aggressive
      ? "aggressive"
      : emotional
        ? "emotional"
        : cinematic
          ? "cinematic"
          : "reflective",
    pacing: aggressive ? "fast" : cinematic ? "escalating" : "medium",
    energy: aggressive ? "high" : emotional ? "medium" : "medium",
    visualStyle: aesthetic
      ? "polished"
      : aggressive
        ? "gritty"
        : cinematic
          ? "cinematic"
          : "raw",
  };
}

export function getMusicSupervisorRecommendations(
  item: ContentIntakeItem,
  remixBrief?: Partial<RemixBrief>
): MusicSupervisorOutput {
  const profile = buildMusicSignalProfile(item, remixBrief);
  const preferredCategories =
    profile.tone === "aggressive"
      ? ["High energy / gym / aggressive", "Viral / trending feel", "Dark / moody"]
      : profile.tone === "emotional"
        ? ["Emotional", "Cinematic", "Dark / moody"]
        : profile.visualStyle === "polished"
          ? ["Clean / luxury / aesthetic", "Viral / trending feel", "Cinematic"]
          : ["Cinematic", "Viral / trending feel", "Emotional"];

  const suggestions = [...MUSIC_CATALOG]
    .sort((leftSong, rightSong) => {
      return (
        getCategoryRank(leftSong.category, preferredCategories) -
        getCategoryRank(rightSong.category, preferredCategories)
      );
    })
    .slice(0, 8)
    .map((song) => ({
      ...song,
      reason: `${song.reason} Current read: ${profile.tone} tone, ${profile.pacing} pacing, ${profile.visualStyle} visuals.`,
    }));

  return {
    profile,
    suggestions,
  };
}
