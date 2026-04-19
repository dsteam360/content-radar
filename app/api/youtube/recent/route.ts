import { NextResponse } from 'next/server'

const API_KEY = process.env.YOUTUBE_API_KEY

type PlaylistItem = {
  contentDetails?: {
    videoId?: string
    videoPublishedAt?: string
  }
  snippet?: {
    title?: string
    channelTitle?: string
    thumbnails?: {
      high?: { url?: string }
      medium?: { url?: string }
      default?: { url?: string }
    }
  }
}

type VideoStatsItem = {
  id?: string
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
}

function toNumberStat(value?: string) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function calculateBreakoutScore({
  viewCount,
  likeCount,
  commentCount,
  publishedAt,
}: {
  viewCount: number
  likeCount: number
  commentCount: number
  publishedAt?: string
}) {
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : Date.now()
  const ageInDays = Math.max(0.5, (Date.now() - publishedTime) / (1000 * 60 * 60 * 24))
  const viewVelocity = viewCount / ageInDays

  return Math.round(viewVelocity / 100 + likeCount * 2 + commentCount * 5)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const handle = searchParams.get('handle')

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Missing YOUTUBE_API_KEY in .env.local' },
        { status: 500 }
      )
    }

    if (!handle) {
      return NextResponse.json(
        { error: 'Missing handle query param' },
        { status: 400 }
      )
    }

    const cleanHandle = handle.replace('@', '')

    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(cleanHandle)}&key=${API_KEY}`,
      { cache: 'no-store' }
    )

    const channelData = await channelRes.json()

    if (!channelRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch channel', details: channelData },
        { status: channelRes.status }
      )
    }

    const channel = channelData.items?.[0]

    if (!channel) {
      return NextResponse.json(
        { error: `No channel found for handle ${handle}` },
        { status: 404 }
      )
    }

    const uploadsPlaylistId =
      channel.contentDetails?.relatedPlaylists?.uploads

    if (!uploadsPlaylistId) {
      return NextResponse.json(
        { error: 'No uploads playlist found for this channel' },
        { status: 404 }
      )
    }

    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=6&key=${API_KEY}`,
      { cache: 'no-store' }
    )

    const playlistData = await playlistRes.json()

    if (!playlistRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch recent videos', details: playlistData },
        { status: playlistRes.status }
      )
    }

    const playlistItems: PlaylistItem[] = playlistData.items || []
    const videoIds = playlistItems
      .map((item) => item.contentDetails?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId))

    let statsByVideoId: Record<
      string,
      {
        viewCount: number
        likeCount: number
        commentCount: number
      }
    > = {}

    if (videoIds.length > 0) {
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(',')}&key=${API_KEY}`,
        { cache: 'no-store' }
      )

      const videosData = await videosRes.json()

      if (!videosRes.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch video statistics', details: videosData },
          { status: videosRes.status }
        )
      }

      statsByVideoId = Object.fromEntries(
        ((videosData.items as VideoStatsItem[]) || []).map((item) => [
          item.id ?? '',
          {
            viewCount: toNumberStat(item.statistics?.viewCount),
            likeCount: toNumberStat(item.statistics?.likeCount),
            commentCount: toNumberStat(item.statistics?.commentCount),
          },
        ])
      )
    }

    const videos = playlistItems.map((item) => {
      const videoId = item.contentDetails?.videoId ?? ''
      const publishedAt = item.contentDetails?.videoPublishedAt
      const viewCount = statsByVideoId[videoId]?.viewCount ?? 0
      const likeCount = statsByVideoId[videoId]?.likeCount ?? 0
      const commentCount = statsByVideoId[videoId]?.commentCount ?? 0

      return {
        id: item.contentDetails?.videoId,
        title: item.snippet?.title,
        publishedAt,
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url,
        channelTitle: item.snippet?.channelTitle,
        viewCount,
        likeCount,
        commentCount,
        breakoutScore: calculateBreakoutScore({
          viewCount,
          likeCount,
          commentCount,
          publishedAt,
        }),
      }
    })

    return NextResponse.json({
      handle,
      channelTitle: channel.snippet?.title,
      channelId: channel.id,
      videos,
    })
  } catch (error) {
    console.error('YouTube route error:', error)

    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    )
  }
}
