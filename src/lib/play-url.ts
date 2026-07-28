/** Rewrite Supabase site URLs to Baiolo proxy (correct MIME in iframe). */
export function toEmbedPlayUrl(playUrl: string, projectId: string) {
  if (!playUrl || !projectId) return playUrl;
  if (playUrl.startsWith(`/api/play-site/${projectId}/`)) return playUrl;

  const marker = `/published/${projectId}/site/`;
  const idx = playUrl.indexOf(marker);
  if (idx >= 0) {
    const relative = playUrl.slice(idx + marker.length).split("?")[0];
    if (relative) return `/api/play-site/${projectId}/${relative}`;
  }
  return playUrl;
}
