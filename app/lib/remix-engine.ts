import {
  createFallbackIntakeAnalysis,
  type ContentIntakeItem,
  type RemixBrief,
} from "@/app/lib/content-intake";

function includesAny(value: string, terms: string[]) {
  const normalizedValue = value.toLowerCase();
  return terms.some((term) => normalizedValue.includes(term));
}

export function buildRemixBrief(item: ContentIntakeItem): RemixBrief {
  const analysis = {
    ...createFallbackIntakeAnalysis(item),
    ...item.analysis_json,
  };
  const signalText = [
    item.title,
    item.notes,
    item.tags_json.join(" "),
    analysis.whyInteresting,
    analysis.likelyWorkedBecause,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const isEmotional = includesAny(signalText, [
    "story",
    "emotional",
    "heart",
    "struggle",
    "journey",
    "before",
    "after",
  ]);
  const isEducational = includesAny(signalText, [
    "how",
    "tips",
    "framework",
    "lesson",
    "learn",
    "mistake",
  ]);
  const isHighEnergy = includesAny(signalText, [
    "gym",
    "hype",
    "motivation",
    "challenge",
    "fast",
    "viral",
  ]);

  return {
    originalReference: item.source_url,
    whyItWorks: analysis.likelyWorkedBecause,
    remakeStrategy: isEducational
      ? "Turn the reference into a clear teachable moment with one specific takeaway."
      : isEmotional
        ? "Keep the emotional arc, but rebuild the story around your own proof, audience, and stakes."
        : "Use the same attention pattern, then change the context, visuals, and payoff so the idea becomes original.",
    whatToKeep: [
      "The core hook pattern",
      "The strongest emotional or curiosity trigger",
      "The pacing lesson that made the reference easy to watch",
    ],
    whatToChange: [
      "Use original footage, examples, and voice",
      "Replace the source creator context with your own audience context",
      "Change the ending so it supports your offer, brand, or message",
    ],
    hookConcept: isEducational
      ? "Most people miss this one detail..."
      : isHighEnergy
        ? "This is what separates the people who win from everyone else..."
        : "I did not expect this to work, but it changed the result...",
    pacingRecommendation: isHighEnergy
      ? "Open fast, cut every 1-2 seconds, and land the payoff before attention drops."
      : "Start with a clean hook, build tension through the middle, and resolve with a memorable final line.",
    emotionalTone: isEmotional
      ? "Reflective with a strong payoff"
      : isHighEnergy
        ? "Driven, urgent, and motivational"
        : "Clear, confident, and useful",
    visualStyleNotes: isHighEnergy
      ? "Use movement, tight cuts, strong contrast, and a visible transformation cue."
      : "Keep the frame readable, use simple visual proof, and avoid clutter around the main idea.",
    editingNotes: "Prioritize the first 3 seconds, remove dead air, and make every cut support the hook.",
    captionAngle: isEducational
      ? "Frame the caption around the lesson and invite saves."
      : "Frame the caption around the transformation or insight the viewer can apply.",
    ctaAngle: "Ask viewers to save this for their next content planning session.",
  };
}
