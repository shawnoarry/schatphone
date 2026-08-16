/**
 * 资料完整度评分：为「书城」视觉生成确定性的虚拟星级。
 *  purely presentational — 不写入数据模型，同一资产永远得到同一分数。
 *
 * 维度：内容量(2) + 目录段落(1) + 标签(1) + WorldBook 引用(1)，满分 5。
 */
export const getBookCompletenessRating = (asset, linkCount = 0) => {
  if (!asset || typeof asset !== 'object') return { score: 0, stars: 0 }
  const chars = String(asset.content || '').trim().length
  const sections = Array.isArray(asset.sections) ? asset.sections.length : 0
  const tags = Array.isArray(asset.tags) ? asset.tags.length : 0
  const links = Number.isFinite(linkCount) ? linkCount : 0
  const raw =
    Math.min(chars / 3000, 1) * 2 +
    Math.min(sections / 8, 1) * 1 +
    Math.min(tags / 3, 1) * 1 +
    Math.min(links / 2, 1) * 1
  const score = Math.round(raw * 10) / 10
  return { score, stars: Math.round(score) }
}
