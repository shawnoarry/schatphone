import { getLanguageBase } from './locale'

export const PEACH_CLOUD_RESTAURANT_ID = 'food_seed_peach_cloud'

export const PEACH_CLOUD_MENU_COPY_BY_ID = Object.freeze({
  food_menu_peach_oolong_cloud: Object.freeze({
    title: Object.freeze({ zh: '白桃青柠气泡', en: 'White Peach Lime Sparkler' }),
    desc: Object.freeze({
      zh: '白桃、鲜青柠、薄荷与天然气泡水，清爽轻盈。',
      en: 'White peach, fresh lime, mint, and sparkling spring water.',
    }),
    ingredients: Object.freeze({
      zh: '白桃、青柠、薄荷、气泡水',
      en: 'white peach, lime, mint, sparkling water',
    }),
    imageAlt: Object.freeze({ zh: '白桃青柠气泡饮', en: 'White Peach Lime Sparkler' }),
  }),
  food_menu_peach_brown_sugar_creme: Object.freeze({
    title: Object.freeze({ zh: '焙香白桃乌龙云顶', en: 'Roasted Peach Oolong Cloud' }),
    desc: Object.freeze({
      zh: '深焙乌龙、白桃奶霜与一抹黑糖尾韵。',
      en: 'Deep roasted oolong, white-peach cream, and a brown-sugar finish.',
    }),
    ingredients: Object.freeze({
      zh: '焙香乌龙、白桃、鲜奶、黑糖奶霜',
      en: 'roasted oolong, white peach, fresh milk, brown sugar cream',
    }),
    imageAlt: Object.freeze({ zh: '焙香白桃乌龙云顶茶', en: 'Roasted Peach Oolong Cloud' }),
  }),
  food_menu_peach_jasmine_cream: Object.freeze({
    title: Object.freeze({ zh: '白桃可可布朗尼', en: 'Peach Cocoa Brownie' }),
    desc: Object.freeze({
      zh: '浓郁黑可可、烘烤坚果与白桃奶霜云。',
      en: 'Fudgy dark cocoa, roasted nuts, and a white-peach cream cloud.',
    }),
    ingredients: Object.freeze({
      zh: '黑可可、黄油、烘烤坚果、白桃奶霜',
      en: 'dark cocoa, butter, roasted nuts, white peach cream',
    }),
    imageAlt: Object.freeze({ zh: '白桃可可布朗尼', en: 'Peach Cocoa Brownie' }),
  }),
  food_menu_peach_sunset_fizz: Object.freeze({
    title: Object.freeze({ zh: '白桃马卡龙巡游', en: 'White Peach Macaron Parade' }),
    desc: Object.freeze({
      zh: '一盒明亮的白桃、玫瑰、香草与可可马卡龙。',
      en: 'A bright box of peach, rose, vanilla, and cocoa macarons.',
    }),
    ingredients: Object.freeze({
      zh: '杏仁粉、白桃奶油、玫瑰、香草、可可',
      en: 'almond flour, peach cream, rose, vanilla, cocoa',
    }),
    imageAlt: Object.freeze({ zh: '白桃马卡龙礼盒', en: 'White Peach Macaron Parade' }),
  }),
  food_menu_peach_yuzu_spark: Object.freeze({
    title: Object.freeze({ zh: '柚香白桃气泡', en: 'Yuzu Peach Spark Pop' }),
    desc: Object.freeze({
      zh: '白桃与清冽柚子苏打，搭配蜂蜜晶球和迷迭香。',
      en: 'White peach and sharp yuzu soda with honey pearls and rosemary.',
    }),
    ingredients: Object.freeze({
      zh: '白桃、柚子、蜂蜜晶球、气泡水、迷迭香',
      en: 'white peach, yuzu, honey pearls, sparkling water, rosemary',
    }),
    imageAlt: Object.freeze({ zh: '柚香白桃气泡饮', en: 'Yuzu Peach Spark Pop soda' }),
  }),
  food_menu_peach_mango_snow: Object.freeze({
    title: Object.freeze({ zh: '白桃可可云朵可丽饼', en: 'Peach Cocoa Crepe Cloud' }),
    desc: Object.freeze({
      zh: '可可可丽饼包裹白桃牛乳冰淇淋与莓果切片。',
      en: 'Cocoa crepes folded around peach-milk gelato and berry slices.',
    }),
    ingredients: Object.freeze({
      zh: '黄油可丽饼、可可、白桃冰淇淋、草莓',
      en: 'butter crepe, cocoa, white peach gelato, strawberry',
    }),
    imageAlt: Object.freeze({ zh: '白桃可可云朵可丽饼', en: 'Peach Cocoa Crepe Cloud' }),
  }),
  food_menu_peach_strawberry_ice: Object.freeze({
    title: Object.freeze({ zh: '白桃马卡龙牛乳冰', en: 'Peach Macaron Milk Ice' }),
    desc: Object.freeze({
      zh: '白桃牛乳冰搭配玫瑰马卡龙与莓果波纹酱。',
      en: 'White-peach milk ice with rose macarons and a berry ripple.',
    }),
    ingredients: Object.freeze({
      zh: '白桃、牛乳冰、杏仁马卡龙、玫瑰、莓果酱',
      en: 'white peach, milk ice, almond macaron, rose, berry compote',
    }),
    imageAlt: Object.freeze({ zh: '白桃马卡龙牛乳冰', en: 'Peach Macaron Milk Ice' }),
  }),
  food_menu_peach_matcha_float: Object.freeze({
    title: Object.freeze({ zh: '白桃冷萃汤力', en: 'Peach Cold Brew Tonic' }),
    desc: Object.freeze({
      zh: '冷萃咖啡、白桃汤力与轻盈奶霜云。',
      en: 'Cold brew, white peach tonic, and a light cream cloud.',
    }),
    ingredients: Object.freeze({
      zh: '冷萃咖啡、白桃汤力、轻奶霜',
      en: 'cold brew, white peach tonic, cream cloud',
    }),
    imageAlt: Object.freeze({ zh: '白桃冷萃汤力咖啡', en: 'Peach Cold Brew Tonic' }),
  }),
  food_menu_peach_sunbeam_basque: Object.freeze({
    title: Object.freeze({ zh: '白桃草莓云朵芝士蛋糕', en: 'Peach Strawberry Cloud Slice' }),
    desc: Object.freeze({
      zh: '冷藏白桃芝士蛋糕，覆以草莓镜面与新鲜薄荷。',
      en: 'Cold-set white-peach cheesecake with strawberry glaze and mint.',
    }),
    ingredients: Object.freeze({
      zh: '奶油奶酪、白桃、草莓、饼干底、莓果镜面',
      en: 'cream cheese, white peach, strawberry, biscuit, berry glaze',
    }),
    imageAlt: Object.freeze({
      zh: '白桃草莓云朵芝士蛋糕',
      en: 'Peach Strawberry Cloud Slice',
    }),
  }),
  food_menu_peach_butter_waffle: Object.freeze({
    title: Object.freeze({ zh: '白桃可可可丽饼圣代', en: 'Peach Cocoa Crepe Sundae' }),
    desc: Object.freeze({
      zh: '柔软可可可丽饼搭配白桃冰淇淋与草莓。',
      en: 'Soft cocoa crepes with white-peach gelato and strawberry.',
    }),
    ingredients: Object.freeze({
      zh: '黄油可丽饼、可可、白桃冰淇淋、草莓',
      en: 'butter crepe, cocoa, white peach gelato, strawberry',
    }),
    imageAlt: Object.freeze({ zh: '白桃可可可丽饼圣代', en: 'Peach Cocoa Crepe Sundae' }),
  }),
  food_menu_peach_pocket_pie: Object.freeze({
    title: Object.freeze({ zh: '红茶白桃烤奶霜', en: 'Black Tea Peach Creme' }),
    desc: Object.freeze({
      zh: '浓香红茶、白桃牛乳与微焦奶霜顶。',
      en: 'Strong black tea, white-peach milk, and a toasted cream crown.',
    }),
    ingredients: Object.freeze({
      zh: '红茶、白桃、牛乳、黑糖、烤奶霜',
      en: 'black tea, white peach, milk, brown sugar, toasted cream',
    }),
    imageAlt: Object.freeze({ zh: '红茶白桃烤奶霜饮品', en: 'Black Tea Peach Creme' }),
  }),
  food_menu_peach_golden_hour_set: Object.freeze({
    title: Object.freeze({ zh: '金桃芝士蛋糕双享', en: 'Golden Peach Cheesecake Pairing' }),
    desc: Object.freeze({
      zh: '一杯白桃气泡搭配一块白桃芝士蛋糕。',
      en: 'One white-peach fizz paired with a peach cheesecake slice.',
    }),
    ingredients: Object.freeze({
      zh: '白桃气泡饮、白桃芝士蛋糕、桃花蜜',
      en: 'white peach fizz, peach cheesecake, peach honey',
    }),
    imageAlt: Object.freeze({
      zh: '金桃气泡饮与芝士蛋糕组合',
      en: 'Golden Peach Cheesecake Pairing',
    }),
  }),
  food_menu_peach_grape_jasmine_tea: Object.freeze({
    title: Object.freeze({ zh: '青提茉莉鲜果茶', en: 'Green Grape Jasmine Fruit Tea' }),
    desc: Object.freeze({
      zh: '清甜青提与冷萃茉莉茶交融，留下干净花香。',
      en: 'Crisp green grapes, cold-brewed jasmine tea, and a clean floral finish.',
    }),
    ingredients: Object.freeze({
      zh: '青提、茉莉茶、茉莉花',
      en: 'green grape, jasmine tea, jasmine blossoms',
    }),
    imageAlt: Object.freeze({ zh: '青提茉莉鲜果茶', en: 'Green Grape Jasmine Fruit Tea' }),
  }),
  food_menu_peach_mango_passion_yogurt: Object.freeze({
    title: Object.freeze({ zh: '芒果百香厚酸奶', en: 'Mango Passionfruit Yogurt' }),
    desc: Object.freeze({
      zh: '熟芒果与百香果果肉旋入浓厚发酵酸奶。',
      en: 'Ripe mango and passionfruit folded through thick cultured yogurt.',
    }),
    ingredients: Object.freeze({
      zh: '芒果、百香果、发酵酸奶',
      en: 'mango, passionfruit, cultured yogurt',
    }),
    imageAlt: Object.freeze({ zh: '芒果百香厚酸奶', en: 'Mango Passionfruit Yogurt' }),
  }),
  food_menu_peach_strawberry_fruit_milk: Object.freeze({
    title: Object.freeze({ zh: '草莓白桃鲜果乳', en: 'Strawberry Peach Fruit Milk' }),
    desc: Object.freeze({
      zh: '新鲜草莓与白桃果肉融入柔滑鲜牛乳。',
      en: 'Fresh strawberries and white peach blended with silky fresh milk.',
    }),
    ingredients: Object.freeze({
      zh: '草莓、白桃、鲜牛乳',
      en: 'strawberry, white peach, fresh milk',
    }),
    imageAlt: Object.freeze({ zh: '草莓白桃鲜果乳', en: 'Strawberry Peach Fruit Milk' }),
  }),
  food_menu_peach_waxberry_lychee_tea: Object.freeze({
    title: Object.freeze({ zh: '杨梅荔枝冰茶', en: 'Waxberry Lychee Iced Tea' }),
    desc: Object.freeze({
      zh: '酸甜杨梅与清润荔枝浸入红宝石色鲜果茶，覆以透亮冰块。',
      en: 'Tart waxberry and juicy lychee steeped into ruby fruit tea over clear ice.',
    }),
    ingredients: Object.freeze({
      zh: '杨梅、荔枝、鲜果茶、冰块',
      en: 'waxberry, lychee, fruit tea, ice',
    }),
    imageAlt: Object.freeze({ zh: '杨梅荔枝冰茶', en: 'Waxberry Lychee Iced Tea' }),
  }),
  food_menu_peach_osmanthus_pear_warm: Object.freeze({
    title: Object.freeze({ zh: '桂花雪梨暖饮', en: 'Osmanthus Pear Warm Infusion' }),
    desc: Object.freeze({
      zh: '新鲜雪梨与芬芳桂花慢慢温泡，清透温润。',
      en: 'Fresh pear gently steeped with fragrant osmanthus for a clear warm infusion.',
    }),
    ingredients: Object.freeze({
      zh: '雪梨、桂花、山泉水',
      en: 'snow pear, osmanthus, spring water',
    }),
    imageAlt: Object.freeze({ zh: '桂花雪梨暖饮', en: 'Osmanthus Pear Warm Infusion' }),
  }),
})

const localizedValue = (copy = {}, language = 'zh-CN') =>
  getLanguageBase(language) === 'en' ? copy.en || copy.zh || '' : copy.zh || copy.en || ''

const resolveStandardField = (currentValue, fieldCopy, language) => {
  const current = typeof currentValue === 'string' ? currentValue : ''
  if (!fieldCopy || ![fieldCopy.zh, fieldCopy.en].includes(current)) return current
  return localizedValue(fieldCopy, language)
}

export const resolvePeachCloudMenuItemCopy = (item = {}, language = 'zh-CN') => {
  const copy = PEACH_CLOUD_MENU_COPY_BY_ID[item?.id]
  if (!copy) return item
  const image = item.image || {}
  return {
    ...item,
    title: resolveStandardField(item.title, copy.title, language),
    desc: resolveStandardField(item.desc, copy.desc, language),
    ingredients: resolveStandardField(item.ingredients, copy.ingredients, language),
    image: {
      ...image,
      alt: resolveStandardField(image.alt, copy.imageAlt, language),
    },
  }
}

export const resolvePeachCloudOrderItemTitle = (item = {}, language = 'zh-CN') => {
  const copy = PEACH_CLOUD_MENU_COPY_BY_ID[item?.menuItemId]
  return copy ? resolveStandardField(item.title, copy.title, language) : item?.title || ''
}

export const getPeachCloudMenuSearchValues = (item = {}) => {
  const copy = PEACH_CLOUD_MENU_COPY_BY_ID[item?.id]
  const values = [item.title, item.desc, item.ingredients]
  if (copy) {
    for (const field of ['title', 'desc', 'ingredients']) {
      values.push(copy[field]?.zh, copy[field]?.en)
    }
  }
  return [...new Set(values.filter(Boolean).map((value) => String(value)))]
}
