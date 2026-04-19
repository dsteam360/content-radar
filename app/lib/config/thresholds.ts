export const MIN_SCORE = 0;
export const MIN_DIVISOR = 1;
export const MIN_VIEWS_BASELINE = 100;
export const HIGH_ENGAGEMENT_RATE = 0.08;
export const COMMENT_VELOCITY_WEIGHT = 5;
export const LIKE_RATIO_WEIGHT = 2;
export const VIEW_GROWTH_WEIGHT = 1;
export const VELOCITY_WEIGHT = 3;
export const FRESHNESS_DECAY_FACTOR = 24;
export const MAX_SCORE = 100;

export const BREAKOUT_REASON_LABELS = {
  strongComments: "Strong comments",
  highEngagement: "High engagement",
  highVelocityEngagement: "High velocity engagement",
  rapidEarlyGrowth: "Rapid early growth",
  recentSurge: "Recent surge",
  fastViews: "Fast views",
  steadyTraction: "Steady traction",
  noSignificantSignal: "No significant signal",
} as const;

export const INTELLIGENCE_THRESHOLDS = {
  time: {
    // Milliseconds in a second for timestamp math.
    millisecondsPerSecond: 1000,
    // Seconds in a minute for relative time formatting.
    secondsPerMinute: 60,
    // Minutes in an hour for relative time formatting.
    minutesPerHour: 60,
    // Hours in a day for relative time formatting.
    hoursPerDay: 24,
    // Minimum age floor used when estimating early video velocity.
    minimumVideoAgeDays: 0.5,
    // Videos within this many days count as recent.
    recentWindowDays: 7,
  },
  breakout: {
    // Minimum breakout score that counts as strong performance.
    strongScoreMinimum: 2500,
    // Minimum breakout score to qualify for the Top Breakouts filter.
    topBreakoutFilterMinimum: 3000,
    // Minimum breakout score for the highest visible breakout tier.
    topTierScoreMinimum: 3000,
    // Baseline used to normalize daily view growth before weighting.
    minViewsBaseline: MIN_VIEWS_BASELINE,
    // Weight applied to normalized daily view growth in the breakout score.
    viewGrowthWeight: VIEW_GROWTH_WEIGHT,
    // Weight applied to likes in the breakout score.
    likeRatioWeight: LIKE_RATIO_WEIGHT,
    // Weight applied to comments in the breakout score.
    commentVelocityWeight: COMMENT_VELOCITY_WEIGHT,
    // Weight applied to combined view/comment velocity in the breakout score.
    velocityWeight: VELOCITY_WEIGHT,
    // Hours over which freshness decays for velocity-heavy scoring.
    freshnessDecayFactor: FRESHNESS_DECAY_FACTOR,
    // Maximum allowed breakout score after clamping.
    maxScore: MAX_SCORE,
  },
  engagement: {
    // Comment count that marks a video as comment-led.
    strongCommentsMinimum: 10,
    // Relative engagement rate that qualifies as high engagement.
    highEngagementRateMinimum: HIGH_ENGAGEMENT_RATE,
    // Absolute likes that also qualify as high engagement.
    highLikesMinimum: 1500,
    // Comment weight used inside engagement-rate scoring.
    commentWeight: 2,
    // Daily views pace that signals fast early traction.
    fastViewsPerDayMinimum: 2000,
    // Total views that also signal fast traction even without velocity.
    fastViewsTotalMinimum: 25000,
  },
  consistency: {
    // Breakout score needed for a video to count toward creator consistency.
    qualifiedVideoScoreMinimum: 2500,
    // Percentage base used when converting ratios into percentages.
    percentageBase: 100,
  },
  analysis: {
    // Visible-video count at or below this is treated as a small sample.
    smallSampleMaximumVideos: 2,
    // Share of visible videos needed to call recent momentum dominant.
    recentMomentumShareMinimum: 0.5,
    // Share of visible videos needed to call engagement a dominant pattern.
    engagementDominanceShareMinimum: 0.5,
    // Share of visible videos needed to call comments a strong signal.
    commentsSignalShareMinimum: 0.4,
    // Lead required for one creator to be called clearly dominant.
    dominantCreatorMultiplier: 1.25,
    // Strong-video share needed to call the top breakout tier concentrated.
    topTierConcentrationShareMinimum: 0.4,
    // Strong videos needed from one creator to call out a cluster.
    creatorClusterStrongVideosMinimum: 2,
    // Number of takeaways or patterns surfaced in analysis sections.
    maxInsightItems: 3,
  },
} as const;
