import { projectAssetUrl, projectUiAssetUrl } from './project-assets'

export const WEATHER_TERRARIUM_ASSETS = Object.freeze({
  scenes: Object.freeze({
    clear: projectUiAssetUrl('widgets/weather-terrarium/weather-terrarium-base.webp'),
    cloudy: projectAssetUrl('widgets/weather-terrarium/weather-terrarium-cloudy-scene.webp'),
    rain: projectAssetUrl('widgets/weather-terrarium/weather-terrarium-rain-scene.webp'),
    night: projectAssetUrl('widgets/weather-terrarium/weather-terrarium-night-scene.webp'),
  }),
  glass: projectUiAssetUrl('widgets/weather-terrarium/weather-terrarium-glass.webp'),
  clouds: projectUiAssetUrl('widgets/weather-terrarium/weather-terrarium-clouds.webp'),
  atmosphere: projectUiAssetUrl('widgets/weather-terrarium/weather-terrarium-atmosphere-alpha-v3.webp'),
})

export const resolveWeatherSceneAsset = (state = 'clear') =>
  WEATHER_TERRARIUM_ASSETS.scenes[state] || WEATHER_TERRARIUM_ASSETS.scenes.clear
