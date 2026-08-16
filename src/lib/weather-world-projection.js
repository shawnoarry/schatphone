import {
  normalizeWeatherSettings,
  resolveWeatherDisplayLocationName,
  resolveWeatherLocationName,
  resolveWeatherMappingForWorld,
} from './weather-contract'

const finiteOrNull = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export const buildWeatherWorldProjection = ({
  weatherSettings,
  worldId = '',
  worldLocationName = '',
  forecast,
  language = 'en',
} = {}) => {
  const settings = normalizeWeatherSettings(weatherSettings)
  const mapping = resolveWeatherMappingForWorld(settings, worldId)
  const sourceLocation = settings.savedLocations.find(
    (location) => location.id === mapping.sourceLocationId,
  ) || settings.savedLocations[0]
  const displayLocationName = resolveWeatherDisplayLocationName({
    mapping,
    sourceLocation,
    worldLocationName,
    language,
  })
  const sourceLocationName = resolveWeatherLocationName(sourceLocation, language)
  const current = forecast?.current && typeof forecast.current === 'object'
    ? forecast.current
    : null
  const condition = String(language || '').toLowerCase().startsWith('zh')
    ? current?.condition?.labelZh
    : current?.condition?.labelEn
  const temperature = finiteOrNull(current?.temperature)
  const apparentTemperature = finiteOrNull(current?.apparentTemperature)
  const precipitationProbability = finiteOrNull(current?.precipitationProbability)
  const sourceExposed = mapping.exposeSourceLocationToAi === true
  const weatherFacts = [
    condition || '',
    temperature === null ? '' : `${temperature}°C`,
    apparentTemperature === null ? '' : `feels like ${apparentTemperature}°C`,
    precipitationProbability === null ? '' : `precipitation ${precipitationProbability}%`,
  ].filter(Boolean)

  return {
    available: Boolean(current),
    displayLocationName,
    mapping,
    sourceExposed,
    sourceLocationName: sourceExposed ? sourceLocationName : '',
    promptText: current
      ? [
          `Mapped local weather for ${displayLocationName}: ${weatherFacts.join(', ')}.`,
          sourceExposed
            ? `Weather source location: ${sourceLocationName}; the user explicitly allowed disclosure.`
            : 'The weather source location is private. Never infer, mention, or expose it; refer only to the mapped display location.',
        ].join('\n')
      : '',
  }
}
