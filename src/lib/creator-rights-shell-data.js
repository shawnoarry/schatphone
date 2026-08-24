export const CREATOR_RIGHTS_STORAGE_KEY = 'schatphone:creator-rights-shell:preview-state'
export const CREATOR_RIGHTS_STORAGE_VERSION = 1

export const CREATOR_RIGHTS_WORKS = Object.freeze([
  Object.freeze({ id: 'credo-work-neon-weather', titleZh: '霓虹天气', titleEn: 'Neon Weather', typeZh: '歌曲', typeEn: 'Song', roleZh: '作曲 / 编曲', roleEn: 'Composer / Arranger', status: 'verified_fixture', year: 2026, shares: Object.freeze([{ nameZh: '我', nameEn: 'Me', roleZh: '作曲', roleEn: 'Composition', share: 35 }, { nameZh: '韩知秀', nameEn: 'Han Jisoo', roleZh: '作词', roleEn: 'Lyrics', share: 25 }, { nameZh: 'North Room', nameEn: 'North Room', roleZh: '制作', roleEn: 'Production', share: 40 }]), statementAmount: 842000 }),
  Object.freeze({ id: 'credo-work-afterimage', titleZh: '残像练习', titleEn: 'Afterimage Study', typeZh: '配乐', typeEn: 'Score', roleZh: '作曲', roleEn: 'Composer', status: 'materials_missing', year: 2026, shares: Object.freeze([{ nameZh: '我', nameEn: 'Me', roleZh: '作曲', roleEn: 'Composition', share: 100 }]), statementAmount: 0 }),
  Object.freeze({ id: 'credo-work-blue-hour', titleZh: '蓝色时刻', titleEn: 'Blue Hour', typeZh: '歌曲', typeEn: 'Song', roleZh: '作词', roleEn: 'Lyricist', status: 'statement_pending', year: 2025, shares: Object.freeze([{ nameZh: '我', nameEn: 'Me', roleZh: '作词', roleEn: 'Lyrics', share: 20 }, { nameZh: 'Morrow Team', nameEn: 'Morrow Team', roleZh: '共同创作', roleEn: 'Co-writing', share: 80 }]), statementAmount: 0 }),
])

export const CREATOR_RIGHTS_STATUS = Object.freeze({
  verified_fixture: Object.freeze({ zh: '资料齐全', en: 'Record complete', tone: 'ready' }),
  materials_missing: Object.freeze({ zh: '待补材料', en: 'Materials needed', tone: 'attention' }),
  statement_pending: Object.freeze({ zh: '待结算单', en: 'Statement pending', tone: 'pending' }),
})

export const getCreatorWork = (id) => CREATOR_RIGHTS_WORKS.find((work) => work.id === id) || null
export const validateCreatorRightsFixtures = () => CREATOR_RIGHTS_WORKS.every((work) => work.id && work.shares.reduce((sum, item) => sum + item.share, 0) === 100 && CREATOR_RIGHTS_STATUS[work.status])
