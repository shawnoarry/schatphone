export const WEATHER_WIDGET_STATES = Object.freeze(['clear', 'cloudy', 'rain', 'night'])

const WEATHER_WIDGET_STATE_SET = new Set(WEATHER_WIDGET_STATES)
const RAIN_PATTERN = /(rain|drizzle|shower|storm|thunder|雨|雷|阵雨|暴雨)/i
const CLOUD_PATTERN = /(cloud|overcast|fog|mist|haze|阴|云|雾|霾)/i
const NIGHT_PATTERN = /(night|moon|夜|月)/i

export const resolveWeatherWidgetState = ({ state = 'auto', condition = '', isNight = false } = {}) => {
  const normalizedState = String(state || '').trim().toLowerCase()
  if (WEATHER_WIDGET_STATE_SET.has(normalizedState)) return normalizedState

  const normalizedCondition = String(condition || '').trim()
  if (RAIN_PATTERN.test(normalizedCondition)) return 'rain'
  if (CLOUD_PATTERN.test(normalizedCondition)) return 'cloudy'
  if (isNight || NIGHT_PATTERN.test(normalizedCondition)) return 'night'
  return 'clear'
}
