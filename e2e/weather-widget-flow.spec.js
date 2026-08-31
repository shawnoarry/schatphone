import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { WEATHER_TERRARIUM_ASSETS } from '../src/lib/weather-visual-assets.js'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation.js'
import { fetchProjectAsset, installProjectAssetRoute } from './helpers/project-assets.js'

const WEATHER_CAPTURE_DIR = process.env.WEATHER_CAPTURE_DIR?.trim()

const createForecast = ({
  city = 'Tokyo',
  temperature = 25,
  weatherCode = 1,
  rainChance = 8,
  isDay = 0,
} = {}) => ({
  timezone: city === 'Shanghai' ? 'Asia/Shanghai' : 'Asia/Tokyo',
  utc_offset_seconds: city === 'Shanghai' ? 28800 : 32400,
  current: {
    time: '2026-08-15T20:00',
    temperature_2m: temperature,
    relative_humidity_2m: city === 'Shanghai' ? 92 : 73,
    apparent_temperature: temperature + 3,
    is_day: isDay,
    precipitation: city === 'Shanghai' ? 0.4 : 0,
    rain: city === 'Shanghai' ? 0.4 : 0,
    showers: 0,
    snowfall: 0,
    weather_code: weatherCode,
    cloud_cover: 58,
    pressure_msl: 1008,
    wind_speed_10m: 4,
    wind_direction_10m: 160,
    wind_gusts_10m: 8,
  },
  hourly: {
    time: ['2026-08-15T20:00', '2026-08-15T21:00', '2026-08-15T22:00'],
    temperature_2m: [temperature, temperature - 1, temperature - 1],
    precipitation_probability: [rainChance, rainChance + 5, rainChance + 10],
    weather_code: [weatherCode, weatherCode, weatherCode],
    is_day: [isDay, 0, 0],
  },
  daily: {
    time: ['2026-08-15', '2026-08-16', '2026-08-17'],
    weather_code: [weatherCode, weatherCode, weatherCode],
    temperature_2m_max: [temperature + 4, temperature + 3, temperature + 2],
    temperature_2m_min: [temperature - 2, temperature - 3, temperature - 3],
    sunrise: ['2026-08-15T05:19', '2026-08-16T05:20', '2026-08-17T05:21'],
    sunset: ['2026-08-15T18:37', '2026-08-16T18:36', '2026-08-17T18:35'],
    precipitation_probability_max: [rainChance, rainChance + 10, rainChance + 15],
  },
})

const WEATHER_STATE_SCENARIOS = [
  {
    state: 'clear',
    weatherCode: 1,
    isDay: 1,
    temperature: 24,
    glassOpacity: '0.96',
    cloudOpacity: '0.68',
    moonOpacity: '0',
    sceneAnimation: 'widget-terrarium-scene-breathe',
  },
  {
    state: 'cloudy',
    weatherCode: 3,
    isDay: 1,
    temperature: 22,
    glassOpacity: '0',
    cloudOpacity: '0',
    moonOpacity: '0',
    sceneAnimation: 'widget-terrarium-cloudy-breathe',
  },
  {
    state: 'rain',
    weatherCode: 61,
    isDay: 1,
    temperature: 18,
    glassOpacity: '0',
    cloudOpacity: '0',
    moonOpacity: '0',
    sceneAnimation: 'widget-terrarium-rain-breathe',
  },
  {
    state: 'night',
    weatherCode: 1,
    isDay: 0,
    temperature: 16,
    glassOpacity: '0',
    cloudOpacity: '0',
    moonOpacity: '0.92',
    sceneAnimation: 'widget-terrarium-night-breathe',
  },
]

test.beforeEach(async ({ page }) => {
  await installProjectAssetRoute(page)
  const weatherAssetUrls = [
    ...Object.values(WEATHER_TERRARIUM_ASSETS.scenes),
    WEATHER_TERRARIUM_ASSETS.glass,
    WEATHER_TERRARIUM_ASSETS.clouds,
    WEATHER_TERRARIUM_ASSETS.atmosphere,
  ]
  for (const url of new Set(weatherAssetUrls)) {
    await fetchProjectAsset(page.request, url)
  }
  await page.route('https://geocoding-api.open-meteo.com/v1/search**', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('name')
    const results = query === '溫哥華'
      ? [{
          id: 6173331,
          name: '溫哥華',
          country: '加拿大',
          country_code: 'CA',
          admin1: '不列顛哥倫比亞',
          latitude: 49.24966,
          longitude: -123.11934,
          timezone: 'America/Vancouver',
        }]
      : query === '温哥华'
        ? []
        : [{
            id: 1796236,
            name: '上海',
            country: '中国',
            country_code: 'CN',
            admin1: '上海市',
            latitude: 31.22222,
            longitude: 121.45806,
            timezone: 'Asia/Shanghai',
          }]
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ results }),
    })
  })
  await page.route('https://api.open-meteo.com/v1/forecast**', async (route) => {
    const latitude = Number(new URL(route.request().url()).searchParams.get('latitude'))
    const isShanghai = Math.abs(latitude - 31.22222) < 0.01
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        isShanghai
          ? createForecast({ city: 'Shanghai', temperature: 27, weatherCode: 51, rainChance: 69 })
          : createForecast(),
      ),
    })
  })
})

test('maps a world display name to a real city and keeps the Weather widget synchronized', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/weather?from=home&homePage=0')

  await expect(page.getByTestId('weather-view')).toHaveClass(/is-night/)
  await expect(page.getByRole('heading', { name: '25°' })).toBeVisible()
  await expect(page.locator('.weather-hourly article')).toHaveCount(3)
  await expect(page.locator('.weather-daily-list article')).toHaveCount(3)

  await page.locator('.weather-location-button').click()
  await expect(page.getByTestId('weather-mapping-sheet')).toBeVisible()
  await page.getByRole('button', { name: '当前世界' }).click()
  await page.getByRole('button', { name: /自定义名称/ }).click()
  await page.getByPlaceholder('例如：首尔、伊莱西亚').fill('首尔')
  await page.getByTestId('weather-mapping-sheet').getByRole('button', { name: /东京 日本/ }).click()
  const citySearch = page.getByPlaceholder('搜索城市，例如温哥华')
  await citySearch.fill('温哥华')
  await expect(page.getByRole('button', { name: '温哥华 不列颠哥伦比亚 · 加拿大' })).toBeVisible()
  await expect(page.getByText('溫哥華')).toHaveCount(0)
  await citySearch.fill('上海')
  await page.getByRole('button', { name: '上海 上海市 · 中国' }).click()
  await expect(page.getByTestId('weather-mapping-sheet')).toContainText('首尔')
  await expect(page.getByTestId('weather-mapping-sheet')).toContainText('天气同步自 上海')
  await page.getByRole('button', { name: '保存映射' }).click()

  await expect(page.locator('.weather-location-button')).toContainText('首尔')
  await expect(page.locator('.weather-location-button')).not.toContainText('上海')
  await expect(page.getByTestId('weather-view')).toHaveClass(/is-rain/)
  await expect(page.getByRole('heading', { name: '27°' })).toBeVisible()

  await navigateInsideUnlockedApp(page, '/widgets?from=home&homePage=0')
  await page.getByTestId('widgets-weather-action-select').selectOption('toggle_details')
  await navigateInsideUnlockedApp(page, '/home?homePage=0')

  const weatherWidget = page.locator('[data-home-tile-id="weather"] .built-in-widget-visual')
  await expect(weatherWidget).toHaveAttribute('data-weather-state', 'rain')
  await expect(weatherWidget).toContainText('首尔')
  await expect(weatherWidget).not.toContainText('上海')
  await weatherWidget.click()
  await expect(weatherWidget).toHaveAttribute('aria-expanded', 'true')
  await expect(page).toHaveURL(/#\/home\?homePage=0$/)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const terrariumMotionLayers = page.locator([
    '.widget-terrarium-stage',
    '.widget-terrarium-aura',
    '.widget-terrarium-clouds',
    '.widget-terrarium-atmosphere',
    '.widget-terrarium-rainfall',
    '.widget-terrarium-mist',
    '.widget-terrarium-stars',
    '.widget-terrarium-moon',
    '.widget-terrarium-glint',
  ].join(', '))
  const terrariumMotionLayerCount = await terrariumMotionLayers.count()
  expect(terrariumMotionLayerCount).toBeGreaterThan(0)
  await expect.poll(() => terrariumMotionLayers.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).animationName),
  )).toEqual(Array(terrariumMotionLayerCount).fill('none'))
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(1)
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(pageErrors).toEqual([])

  await testInfo.attach('weather-widget-flow.png', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
})

for (const scenario of WEATHER_STATE_SCENARIOS) {
  test(`renders the ${scenario.state} Terrarium as its own 2x2 scene`, async ({ page }, testInfo) => {
    await page.unroute('https://api.open-meteo.com/v1/forecast**')
    await page.route('https://api.open-meteo.com/v1/forecast**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(createForecast(scenario)),
      })
    })

    await unlockToHome(page)

    const weatherTile = page.locator('[data-home-tile-id="weather"]')
    const weatherWidget = weatherTile.locator('.built-in-widget-visual')
    await expect(weatherTile).toHaveAttribute('data-home-slot-size', '2x2')
    await expect(weatherWidget).toHaveAttribute('data-weather-state', scenario.state)
    await expect.poll(() => weatherWidget.locator('.widget-terrarium-scene').evaluate((image) => ({
      complete: image.complete,
      naturalWidth: image.naturalWidth,
    }))).toEqual({ complete: true, naturalWidth: 1024 })

    const bounds = await weatherWidget.boundingBox()
    expect(bounds?.width).toBeGreaterThan(0)
    expect(bounds?.height).toBeGreaterThan(0)
    await expect(weatherWidget.locator('.widget-terrarium-glass')).toHaveCSS('opacity', scenario.glassOpacity)
    await expect(weatherWidget.locator('.widget-terrarium-clouds.is-back')).toHaveCSS('opacity', scenario.cloudOpacity)
    await expect(weatherWidget.locator('.widget-terrarium-moon')).toHaveCSS('opacity', scenario.moonOpacity)
    await expect.poll(() =>
      weatherWidget
        .locator('.widget-terrarium-scene')
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toMatch(new RegExp(`^${scenario.sceneAnimation}(?:-[a-z0-9]+)?$`))

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    const screenshot = await page.screenshot({
      animations: 'disabled',
      clip: {
        x: Math.max(0, bounds.x - 12),
        y: Math.max(0, bounds.y - 12),
        width: Math.min(page.viewportSize().width - Math.max(0, bounds.x - 12), bounds.width + 24),
        height: Math.min(page.viewportSize().height - Math.max(0, bounds.y - 12), bounds.height + 24),
      },
    })
    await testInfo.attach(`weather-terrarium-${scenario.state}.png`, {
      body: screenshot,
      contentType: 'image/png',
    })
    if (WEATHER_CAPTURE_DIR) {
      const captureDir = path.resolve(WEATHER_CAPTURE_DIR)
      await mkdir(captureDir, { recursive: true })
      await writeFile(
        path.join(captureDir, `weather-terrarium-${scenario.state}-${testInfo.project.name}.png`),
        screenshot,
      )
    }
  })
}

test('installs the Weather app entry from App Store and opens the standalone Weather surface', async ({
  page,
}) => {
  await unlockToHome(page)
  await expect(page.locator('[data-home-tile-id="app_weather"]')).toHaveCount(0)

  await navigateInsideUnlockedApp(page, '/app-store?homePage=0')
  await page.getByTestId('app-store-search').fill('天气')
  await page.getByTestId('app-store-item-app_weather').click()

  const inlineAddHome = page.getByTestId('app-store-add-home')
  if (await inlineAddHome.isVisible()) {
    await inlineAddHome.click()
  } else {
    await page
      .getByTestId('app-store-detail-sheet')
      .getByRole('button', { name: /加入主屏|Add to Home/ })
      .click()
  }

  await expect(page).toHaveURL(/#\/home\?homePage=0$/)
  await expect(page.getByTestId('home-edit-done')).toBeVisible()
  await expect(page.getByTestId('home-library-candidate-app_weather')).toHaveClass(/is-active/)
  await page.locator('.home-empty-slot-action.is-compatible').first().click()
  await expect(page.locator('[data-home-tile-id="app_weather"]')).toBeVisible()
  await page.getByTestId('home-edit-done').click()
  await expect(page.getByTestId('home-edit-done')).toHaveCount(0)
  await page.waitForTimeout(250)

  const weatherAppTile = page.locator('[data-home-tile-id="app_weather"]')
  await expect(weatherAppTile).not.toHaveClass(/is-drop-confirm/)
  await weatherAppTile.locator('.home-app-tile').click()
  await expect(page).toHaveURL(/#\/weather\?(?:homePage=0&from=home|from=home&homePage=0)/)
  await expect(page.getByTestId('weather-view')).toBeVisible()
  await expect(page.locator('.weather-hero .built-in-widget-visual')).toHaveCount(0)
})
