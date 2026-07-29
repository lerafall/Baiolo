/** Rewrite Supabase / Baiolo site URLs to the correct proxy (MIME in iframe). */
export function toEmbedPlayUrl(playUrl: string, projectId: string) {
  if (!playUrl || !projectId) return playUrl;
  if (playUrl.startsWith(`/api/play-site/${projectId}/`)) return playUrl;
  if (playUrl.startsWith(`/api/owner-play-site/${projectId}/`)) return playUrl;
  if (playUrl.startsWith(`/api/admin/preview-site/${projectId}/`)) {
    return playUrl.replace(
      `/api/admin/preview-site/${projectId}/`,
      `/api/owner-play-site/${projectId}/`,
    );
  }

  const publishedMarker = `/published/${projectId}/site/`;
  const publishedIdx = playUrl.indexOf(publishedMarker);
  if (publishedIdx >= 0) {
    const relative = playUrl.slice(publishedIdx + publishedMarker.length).split("?")[0];
    if (relative) return `/api/play-site/${projectId}/${relative}`;
  }

  const reviewMarker = `/review/${projectId}/site/`;
  const reviewIdx = playUrl.indexOf(reviewMarker);
  if (reviewIdx >= 0) {
    const relative = playUrl.slice(reviewIdx + reviewMarker.length).split("?")[0];
    if (relative) return `/api/owner-play-site/${projectId}/${relative}`;
  }

  return playUrl;
}
