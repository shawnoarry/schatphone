import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '../../..')
const appAssetRoot = join(repoRoot, 'public/images/ui-assets/apps/food-delivery')
const legacyAssetRoot = join(repoRoot, 'public/images/food-delivery')
const outputPath = join(import.meta.dirname, 'asset-truth-matrix.json')

const sourceFiles = [
  'src/views/FoodDeliveryView.vue',
  'src/stores/foodDelivery.js',
  'tests/food-delivery-view.test.js',
  'docs/pm/commerce-finance-and-assets/FOOD_DELIVERY_IMAGE2_ASSET_PROMPTS.md',
  'docs/pm/commerce-finance-and-assets/FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md',
]

const sourceLines = Object.fromEntries(
  sourceFiles.map((file) => [file, readFileSync(join(repoRoot, file), 'utf8').split(/\r?\n/)]),
)

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')

const pngMetadata = (buffer) => {
  const colorType = buffer[25]
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    format: 'PNG',
    alpha: colorType === 4 || colorType === 6,
    pngColorType: colorType,
  }
}

const jpegMetadata = (buffer) => {
  let offset = 2
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break
    const marker = buffer[offset + 1]
    const length = buffer.readUInt16BE(offset + 2)
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
        format: 'JPEG',
        alpha: false,
      }
    }
    offset += 2 + length
  }
  return { width: null, height: null, format: 'JPEG', alpha: false }
}

const svgMetadata = (buffer) => {
  const text = buffer.toString('utf8')
  const viewBox = text.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i)
  const width = text.match(/\bwidth=["']([\d.]+)(?:px)?["']/i)
  const height = text.match(/\bheight=["']([\d.]+)(?:px)?["']/i)
  return {
    width: viewBox ? Number(viewBox[1]) : width ? Number(width[1]) : null,
    height: viewBox ? Number(viewBox[2]) : height ? Number(height[1]) : null,
    format: 'SVG',
    alpha: true,
  }
}

const imageMetadata = (path, buffer) => {
  const extension = extname(path).toLowerCase()
  if (extension === '.png') return pngMetadata(buffer)
  if (extension === '.jpg' || extension === '.jpeg') return jpegMetadata(buffer)
  if (extension === '.svg') return svgMetadata(buffer)
  return { width: null, height: null, format: extension.slice(1).toUpperCase(), alpha: null }
}

const findReferences = (needles) => {
  const normalizedNeedles = [...new Set(needles.filter(Boolean))]
  return Object.entries(sourceLines).flatMap(([file, lines]) =>
    lines.flatMap((line, index) =>
      normalizedNeedles.some((needle) => line.includes(needle))
        ? [`${file}:${index + 1}`]
        : [],
    ),
  )
}

const wiredMoonPaths = new Set([
  'moon-bistro/cover/moon-bistro-cover-02.png',
  ...[1, 2, 3, 5, 7, 9, 15, 29, 50].map(
    (index) => `moon-bistro/dishes/moon-bistro-dish-${String(index).padStart(2, '0')}.png`,
  ),
])

const wiredPlatformPaths = new Set([
  'platform/banners/platform-banner-member-delivery-01.png',
  'platform/banners/platform-banner-weekend-food-01.png',
  'platform/banners/platform-banner-lunch-express-01.png',
  'platform/merchants/merchant-korean-beef-soup-02.png',
  'platform/merchants/merchant-sushi-02.png',
  'platform/merchants/merchant-pizza-02.png',
  'platform/merchants/merchant-salad-bowl-02.png',
  'platform/merchants/merchant-fried-chicken-02.png',
  'platform/diagnostics/missing-asset-placeholder.svg',
])

const obsoleteAppPatterns = [
  /^platform\/banners\/platform-banner-(combo|free-delivery)-01\.png$/,
  /^platform\/merchants\/merchant-.+-01\.png$/,
  /^platform\/categories\/(icons\/category-rice-bowl|source-sheets\/food-category-icon-sheet)-\d+\.png$/,
]

const classifyActual = (assetPath) => {
  if (assetPath.startsWith('legacy/')) {
    return {
      status: 'obsolete_or_duplicate',
      runtimeState: '旧目录文件；当前 FoodDeliveryView 未引用。',
      documentState: '不应作为新缺口或正式接线来源。',
    }
  }
  if (assetPath === 'platform/decorations/mascot/delivery-rider-mascot-01.png') {
    return {
      status: 'replacement_candidate',
      runtimeState: '外卖平台首页搜索框旁正在使用。',
      documentState: '已有正式素材；因无 Alpha、棋盘格烘入和可读品牌字样，仅在明确批准后才可替换。',
    }
  }
  if (assetPath.startsWith('peach-cloud/')) {
    return {
      status: 'present_and_wired',
      runtimeState: 'Peach Cloud 封面、品牌、分类或产品动态映射正在使用。',
      documentState: '文档已记录 19 项本地素材；禁止重复生成。',
    }
  }
  if (wiredMoonPaths.has(assetPath)) {
    return {
      status: 'present_and_wired',
      runtimeState: 'Food Delivery seed 数据直接引用。',
      documentState: '实际实现已超过早期 4 项提示词，不应按旧提示词重复生成。',
    }
  }
  if (assetPath.startsWith('moon-bistro/')) {
    return {
      status: 'present_not_wired',
      runtimeState: '文件存在，但当前 seed/runtime 未引用该编号。',
      documentState: '可作为后续菜单扩展候选，不是缺失。',
    }
  }
  if (wiredPlatformPaths.has(assetPath)) {
    return {
      status: 'present_and_wired',
      runtimeState: '外卖平台页面直接引用。',
      documentState: '已配置并在使用；禁止重复生成。',
    }
  }
  if (obsoleteAppPatterns.some((pattern) => pattern.test(assetPath))) {
    return {
      status: 'obsolete_or_duplicate',
      runtimeState: '文件存在，但当前代码使用另一版本或明确判定该源图不适用。',
      documentState: '保留历史证据，不进入生图缺口。',
    }
  }
  return {
    status: 'present_not_wired',
    runtimeState: '文件存在，当前源码未直接接线。',
    documentState: '先评估复用、透明度和语义适配，不得按缺失重复生成。',
  }
}

const actualFiles = [
  ...walk(appAssetRoot).map((path) => ({ root: appAssetRoot, path, prefix: '' })),
  ...walk(legacyAssetRoot).map((path) => ({ root: legacyAssetRoot, path, prefix: 'legacy/' })),
]
  .filter(({ path }) => ['.png', '.jpg', '.jpeg', '.svg'].includes(extname(path).toLowerCase()))
  .map(({ root, path, prefix }) => {
    const assetPath = `${prefix}${relative(root, path).replaceAll('\\', '/')}`
    const buffer = readFileSync(path)
    const metadata = imageMetadata(path, buffer)
    const classification = classifyActual(assetPath)
    const basename = assetPath.split('/').at(-1)
    return {
      kind: 'actual_file',
      assetPath,
      repositoryPath: relative(repoRoot, path).replaceAll('\\', '/'),
      exists: true,
      bytes: statSync(path).size,
      ...metadata,
      sha256: sha256(buffer),
      ...classification,
      evidence: findReferences([assetPath.replace(/^legacy\//, ''), basename]),
    }
  })
  .sort((a, b) => a.assetPath.localeCompare(b.assetPath))

const missingSlot = ({
  slotId,
  displayNameZh,
  expectedPath,
  status,
  runtimeState,
  documentState,
  existingAlternatives = [],
  evidenceNeedles = [],
  trueGenerationGap = false,
}) => ({
  kind: 'expected_slot',
  slotId,
  displayNameZh,
  expectedPath,
  repositoryPath: `public/images/ui-assets/apps/food-delivery/${expectedPath}`,
  exists: existsSync(join(appAssetRoot, expectedPath)),
  width: null,
  height: null,
  format: null,
  alpha: null,
  sha256: null,
  status,
  runtimeState,
  documentState,
  existingAlternatives,
  trueGenerationGap,
  evidence: findReferences([expectedPath, ...evidenceNeedles]),
})

const categoryDefinitions = [
  ['all', '全部'],
  ['meal', '正餐'],
  ['fast-food', '快餐'],
  ['fried-chicken', '炸鸡'],
  ['pizza', '披萨'],
  ['cafe', '咖啡轻食'],
  ['dessert', '甜品'],
  ['grocery', '生鲜'],
  ['noodles', '面食'],
  ['sushi', '寿司'],
]

const merchantDefinitions = [
  ['hanwoo-gukbap', '逆站洞韩牛汤饭'],
  ['sushi-hana', '寿司花'],
  ['hwadeok-pizza', '花德披萨味店'],
  ['salad-day', '沙拉日记'],
  ['chicken-crisp', '脆脆炸鸡屋'],
  ['berry-morning', '莓果晨光'],
  ['green-basket', '青禾鲜食补给站'],
  ['camellia-noodles', '山茶牛肉面馆'],
  ['morning-bagel', '早安贝果咖啡'],
  ['elm-dim-sum', '榆树里蒸点铺'],
  ['coconut-curry', '南风椰香咖喱'],
]

const menuNames = {
  'hanwoo-gukbap': ['逆站洞一号韩牛汤饭', '泡菜红锅·双人份', '清晨雪浓汤定食', '逆站洞醒酒辣汤', '海风泡菜煎饼'],
  'sushi-hana': ['花见十二贯', '小町炸猪排便当', '海风亲子散寿司', '暮色炙鳗牛油果卷', '赤味噌蛤蜊汤'],
  'hwadeok-pizza': ['花德蜂蜜双芝士', '周五半半鸡翅篮', '炉边番茄罗勒', '红椒烟熏辣肠', '花德玉米焗薯'],
  'salad-day': ['日记 No.1 牛油果鸡胸碗', '今日莓果酸奶罐', '海岸线三文鱼谷物碗', '烤南瓜暖汤午餐组', '青柠冰摇气泡美式'],
  'chicken-crisp': ['脆脆 50/50 半半鸡', '金瀑芝士厚切薯', '黑蒜无骨鸡块', '辣年糕串串', '蜂蜜黄油脆薯角'],
  'berry-morning': ['晨光莓莓云朵杯', '绿野牛油果鲜果碗', '开心果晨曦巴斯克', '南岛芒果椰露', '草莓初光可颂'],
  'green-basket': ['青禾今日蔬果箱', '06:30 早餐补给', '绿能一日轻食箱', '深夜灯火补给包', '厨房 SOS 调味组'],
  'camellia-noodles': ['山茶一号红烧宽面', '桂香番茄鸡蛋拌面', '老街豌杂细面', '山茶酸汤肥牛米线', '秘制红油抄手'],
  'morning-bagel': ['GOOD AM 烟熏鸡贝果', '晨盐焦糖拿铁', '绿意煎蛋贝果', '早安苹果肉桂司康', '柚光冰摇美式'],
  'elm-dim-sum': ['榆树里虾仁三拼', '十八褶鲜肉小笼', '金沙流心奶黄包', '荷香腊味糯米鸡', '巷口咸豆浆油条'],
  'coconut-curry': ['南风一号椰香鸡', '槟城咖喱虾饭', '青罗勒绿咖喱牛', '南风冬阴功海鲜汤', '斑斓椰奶小布丁'],
}

const expectedSlots = [
  missingSlot({
    slotId: 'weekend-lucky-draw-poster',
    displayNameZh: '周末抽奖活动页竖版海报',
    expectedPath: 'platform/campaigns/weekend-lucky-draw-poster-01.png',
    status: 'wired_missing',
    runtimeState: '代码请求该文件；加载失败后兼容回退到已存在的周末横幅。',
    documentState: '路径缺失但页面并非诊断占位，不是首批生图优先项。',
    existingAlternatives: ['platform/banners/platform-banner-weekend-food-01.png'],
  }),
  ...categoryDefinitions.map(([key, label]) =>
    missingSlot({
      slotId: `platform-category-${key}`,
      displayNameZh: `平台分类图标：${label}`,
      expectedPath: `platform/categories/icons/category-${key}-01.png`,
      status: 'fallback_only',
      runtimeState: '页面只显示 Font Awesome 图标；data-required-asset 仅记录未来路径，并未加载图片。',
      documentState: '文档明确写为可选升级，不是真实缺口。',
      existingAlternatives: key === 'meal' ? ['platform/categories/icons/category-rice-bowl-01.png', 'platform/categories/icons/category-rice-bowl-02.png'] : [],
    }),
  ),
  ...[
    ['merchant-logo-berry-morning-01.png', '莓果晨光 Logo'],
    ['merchant-logo-green-basket-01.png', '青禾鲜食补给站 Logo'],
    ['merchant-logo-morning-bagel-01.png', '早安贝果咖啡 Logo'],
    ['merchant-logo-elm-dim-sum-01.png', '榆树里蒸点铺 Logo'],
  ].map(([file, name]) =>
    missingSlot({
      slotId: file.replace(/\.png$/, ''),
      displayNameZh: name,
      expectedPath: `platform/merchants/logos/${file}`,
      status: 'wired_missing',
      runtimeState: '商家卡片会请求该文件；失败后隐藏图片，显示代码生成的文字 Logo 和渐变底。',
      documentState: '已有可用兼容回退，属于质量提升而非阻断缺口。',
    }),
  ),
  ...[
    ['merchant-noodle-house-01.png', '山茶牛肉面馆主图'],
    ['merchant-coconut-curry-01.png', '南风椰香咖喱主图'],
  ].map(([file, name]) =>
    missingSlot({
      slotId: file.replace(/\.png$/, ''),
      displayNameZh: name,
      expectedPath: `platform/merchants/${file}`,
      status: 'fallback_only',
      runtimeState: '代码仅记录 requiredAsset，imageUrl 为空；页面显示图标和渐变兜底。',
      documentState: '未接线请求，属于可选视觉补齐。',
    }),
  ),
  ...merchantDefinitions.flatMap(([merchantKey, merchantName]) =>
    menuNames[merchantKey].map((itemName, index) =>
      missingSlot({
        slotId: `platform-menu-${merchantKey}-${index + 1}`,
        displayNameZh: `${merchantName}：${itemName}`,
        expectedPath: `platform/menus/${merchantKey}/menu-item-${String(index + 1).padStart(2, '0')}.png`,
        status: 'wired_missing',
        runtimeState: '菜单与活动推荐会请求该文件；失败后切换到高对比诊断占位图。',
        documentState: '文件、同菜品现有素材均不存在，属于真实视觉缺口。',
        evidenceNeedles: ['platformMenuItemAssetPath', 'handlePlatformMenuImageError'],
        trueGenerationGap: true,
      }),
    ),
  ),
  ...[
    ['platform-checkout-takeout-bag-01.png', '结算页外卖袋主插图', ['platform/decorations/packaging/delivery-bag-01.png']],
    ['platform-order-status-placed-01.png', '已下单状态主插图', ['platform/decorations/packaging/delivery-bag-01.png', 'platform/decorations/coupons/receipt-heart-01.png']],
    ['platform-order-status-preparing-01.png', '制作中状态主插图', ['platform/decorations/packaging/delivery-bag-02.png']],
    ['platform-order-status-delivering-01.png', '配送中状态主插图', ['platform/decorations/mascot/delivery-rider-mascot-01.png', 'legacy/platform-delivery-rider.png', 'legacy/platform-delivery-rider.svg']],
    ['platform-order-status-delivered-01.png', '已送达状态主插图', ['platform/decorations/packaging/delivery-bag-03.png']],
    ['platform-order-status-cancelled-01.png', '已取消状态主插图', ['platform/decorations/packaging/delivery-bag-04.png']],
    ['platform-orders-empty-receipt-01.png', '无订单空状态小票插图', ['platform/decorations/coupons/receipt-heart-01.png']],
  ].map(([file, name, alternatives]) =>
    missingSlot({
      slotId: file.replace(/\.png$/, ''),
      displayNameZh: name,
      expectedPath: `platform/orders/${file}`,
      status: 'fallback_only',
      runtimeState: '页面硬编码显示诊断占位图；expectedPath 只存在于 data-required-asset。',
      documentState: '仓库已有同语义素材，必须先评估复用或本地修复，不能直接计为生图缺口。',
      existingAlternatives: alternatives,
    }),
  ),
  missingSlot({
    slotId: 'platform-order-status-delayed-01',
    displayNameZh: '未来延误状态主插图',
    expectedPath: 'platform/orders/platform-order-status-delayed-01.png',
    status: 'obsolete_or_duplicate',
    runtimeState: '当前状态机和页面不显示该状态。',
    documentState: '文档明确标为未来状态，不属于当前缺口。',
  }),
  ...[
    ['platform_hanwoo_gukbap', 'hanwoo', '逆站洞韩牛汤饭', 'platform/merchants/merchant-korean-beef-soup-02.png'],
    ['platform_sushi_hana', 'sushi-hana', '寿司花', 'platform/merchants/merchant-sushi-02.png'],
    ['platform_hwadeok_pizza', 'hwadeok-pizza', '花德披萨味店', 'platform/merchants/merchant-pizza-02.png'],
    ['platform_salad_day', 'salad-day', '沙拉日记', 'platform/merchants/merchant-salad-bowl-02.png'],
    ['platform_chicken_crisp', 'chicken-crisp', '脆脆炸鸡屋', 'platform/merchants/merchant-fried-chicken-02.png'],
    ['platform_neighborhood_soup', 'camellia-noodles', '山茶牛肉面馆', 'platform/decorations/packaging/delivery-bag-01.png'],
    ['platform_corner_pizza', 'coconut-curry', '南风椰香咖喱', 'platform/decorations/packaging/delivery-bag-02.png'],
  ].map(([merchantId, fileKey, name, alternative]) =>
    missingSlot({
      slotId: `platform-order-merchant-mark-${merchantId}`,
      displayNameZh: `订单列表商家身份图：${name}`,
      expectedPath: `platform/orders/merchant-marks/platform-merchant-mark-${fileKey}-01.png`,
      status: 'fallback_only',
      runtimeState: '订单列表硬编码显示诊断占位图，目标路径只写入 data-required-asset。',
      documentState: '已有商家主图或通用包装素材可评估复用，不应默认新生成。',
      existingAlternatives: [alternative],
      evidenceNeedles: ['platformMerchantIdentityAssetPath'],
    }),
  ),
  missingSlot({
    slotId: 'peach-cloud-brand-png-mismatch',
    displayNameZh: 'Peach Cloud 品牌图 PNG 误标路径',
    expectedPath: 'peach-cloud/brand/peach-cloud-mark-01.png',
    status: 'obsolete_or_duplicate',
    runtimeState: '一处 data-required-asset 写成 PNG，但正式实现使用并加载现有 SVG。',
    documentState: '属于代码标记不一致，不是生图缺口。',
    existingAlternatives: ['peach-cloud/brand/peach-cloud-mark-01.svg'],
  }),
]

const entries = [...actualFiles, ...expectedSlots]
const summary = entries.reduce((counts, entry) => {
  counts[entry.status] = (counts[entry.status] || 0) + 1
  return counts
}, {})

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  repoHead: '54befc4c0361a4c2e6088bc52e1ee06710af1c16',
  scope: 'Food Delivery existing-asset truth audit before any generation or upload',
  authorityNote: 'Repository files and runtime source mappings are truth; prompt and handoff documents are comparison evidence only.',
  externalStateChanged: false,
  totalActualFiles: actualFiles.length,
  totalExpectedSlotsAudited: expectedSlots.length,
  trueGenerationGapCount: expectedSlots.filter((entry) => entry.trueGenerationGap).length,
  summary,
  entries,
}

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ outputPath, ...output, entries: undefined }, null, 2))
