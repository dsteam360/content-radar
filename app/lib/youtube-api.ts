import { getYoutubeEnv } from "@/app/lib/env";
import type { Video } from "@/app/lib/youtube-insights";
import { calculateBreakoutScore, getBreakoutReason } from "@/app/lib/youtube-scoring";

const YOUTUBE_REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_RECENT_VIDEO_LIMIT = 6;

type PlaylistItem = {
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

type VideoStatsItem = {
  id?: string;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

type ChannelLookupResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
    };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
};

type PlaylistLookupResponse = {
  items?: PlaylistItem[];
};

type VideoStatsResponse = {
  items?: VideoStatsItem[];
};

export type YoutubeRecentVideosResult = {
  handle: string;
  channelId: string;
  channelTitle: string;
  videos: Video[];
};

export class YoutubeApiError extends Error {
  status: number;
  operation: string;

  constructor(message: string, operation: string, status = 500) {
    super(message);
    this.name = "YoutubeApiError";
    this.status = status;
    this.operation = operation;
  }
}

function normalizeYoutubeStat(value?: string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

async function fetchYoutubeJson<T>(url: string, operation: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), YOUTUBE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as T & {
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new YoutubeApiError(
        data.error?.message || `YouTube ${operation} failed.`,
        operation,
        response.status
      );
    }

    return data;
  } catch (error) {
    if (error instanceof YoutubeApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new YoutubeApiError(
        `YouTube ${operation} timed out after ${YOUTUBE_REQUEST_TIMEOUT_MS}ms.`,
        operation,
        504
      );
    }

    throw new YoutubeApiError(
      error instanceof Error
        ? error.message
        : `YouTube ${operation} failed unexpectedly.`,
      operation
    );
  } finally {
    clearTimeout(timeout);
  }
}

function buildThumbnailUrl(item: PlaylistItem) {
  return (
    item.snippet?.thumbnails?.high?.url ||
    item.snippet?.thumbnails?.medium?.url ||
    item.snippet?.thumbnails?.default?.url
  );
}

export async function fetchRecentYoutubeVideosByHandle(
  handle: string,
  maxResults = DEFAULT_RECENT_VIDEO_LIMIT
): Promise<YoutubeRecentVideosResult> {
  const { youtubeApiKey } = getYoutubeEnv();
  const normalizedHandle = handle.trim().replace(/^@/, "");

  if (!normalizedHandle) {
    throw new YoutubeApiError("Missing YouTube handle.", "handle validation", 400);
  }

  const channelData = await fetchYoutubeJson<ChannelLookupResponse>(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(
      normalizedHandle
    )}&key=${youtubeApiKey}`,
    "channel lookup"
  );

  const channel = channelData.items?.[0];

  if (!channel?.contentDetails?.relatedPlaylists?.uploads || !channel.id) {
    throw new YoutubeApiError(
      `No YouTube channel was found for @${normalizedHandle}.`,
      "channel lookup",
      404
    );
  }

  const playlistData = await fetchYoutubeJson<PlaylistLookupResponse>(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${channel.contentDetails.relatedPlaylists.uploads}&maxResults=${maxResults}&key=${youtubeApiKey}`,
    "recent video lookup"
  );

  const playlistItems = playlistData.items ?? [];
  const videoIds = playlistItems
    .map((item) => item.contentDetails?.videoId)
    .filter((videoId): videoId is string => Boolean(videoId));

  let statsByVideoId: Record<
    string,
    {
      viewCount: number;
      likeCount: number;
      commentCount: number;
    }
  > = {};

  if (videoIds.length > 0) {
    const videosData = await fetchYoutubeJson<VideoStatsResponse>(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(",")}&key=${youtubeApiKey}`,
      "video statistics lookup"
    );

    statsByVideoId = Object.fromEntries(
      (videosData.items ?? []).map((item) => [
        item.id ?? "",
        {
          viewCount: normalizeYoutubeStat(item.statistics?.viewCount),
          likeCount: normalizeYoutubeStat(item.statistics?.likeCount),
          commentCount: normalizeYoutubeStat(item.statistics?.commentCount),
        },
      ])
    );
  }

  const videos = playlistItems.reduce<Video[]>((allVideos, item) => {
      const videoId = item.contentDetails?.videoId;
      const publishedAt = item.contentDetails?.videoPublishedAt;

      if (!videoId || !publishedAt) {
        return allVideos;
      }

      const currentTimestamp = Date.now();
      const viewCount = statsByVideoId[videoId]?.viewCount ?? 0;
      const likeCount = statsByVideoId[videoId]?.likeCount ?? 0;
      const commentCount = statsByVideoId[videoId]?.commentCount ?? 0;
      const breakoutScore = calculateBreakoutScore({
        viewCount,
        likeCount,
        commentCount,
        publishedAt,
        currentTimestamp,
      });

      allVideos.push({
        id: videoId,
        title: item.snippet?.title ?? "Untitled video",
        publishedAt,
        thumbnail: buildThumbnailUrl(item),
        channelTitle: item.snippet?.channelTitle || channel.snippet?.title,
        viewCount,
        likeCount,
        commentCount,
        currentTimestamp,
        breakoutScore,
        breakoutReason: getBreakoutReason({
          breakoutScore,
          viewCount,
          likeCount,
          commentCount,
          publishedAt,
          currentTimestamp,
        }),
      } satisfies Video);

      return allVideos;
    }, []);

  return {
    handle: `@${normalizedHandle}`,
    channelId: channel.id,
    channelTitle: channel.snippet?.title || `@${normalizedHandle}`,
    videos,
  };
}
