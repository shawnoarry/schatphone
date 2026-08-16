import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import BuiltInWidgetVisual from '../src/components/widgets/BuiltInWidgetVisual.vue'
import { resolveWeatherWidgetState } from '../src/lib/weather-widget-state'

describe('Weather widget state', () => {
  test('normalizes explicit state, condition text, and night fallback', () => {
    expect(resolveWeatherWidgetState({ condition: 'Clear' })).toBe('clear')
    expect(resolveWeatherWidgetState({ condition: '多云' })).toBe('cloudy')
    expect(resolveWeatherWidgetState({ condition: 'Light rain' })).toBe('rain')
    expect(resolveWeatherWidgetState({ condition: 'Clear', isNight: true })).toBe('night')
    expect(resolveWeatherWidgetState({ state: 'cloudy', isNight: true })).toBe('cloudy')
  })

  test('reacts to weather input without replacing the shared terrarium renderer', async () => {
    const wrapper = mount(BuiltInWidgetVisual, {
      props: {
        variant: 'weather',
        language: 'zh-CN',
        condition: '晴朗',
        temperature: 21,
      },
    })

    expect(wrapper.attributes('data-weather-state')).toBe('clear')
    expect(wrapper.classes()).toContain('is-weather-clear')
    expect(wrapper.text()).toContain('21°')
    expect(wrapper.findAll('.widget-terrarium-layer')).toHaveLength(5)
    expect(wrapper.get('.widget-terrarium-scene').attributes('src')).toContain(
      'widgets/weather-terrarium/weather-terrarium-base.webp',
    )
    expect(wrapper.find('.widget-terrarium-rainfall').exists()).toBe(true)
    expect(wrapper.find('.widget-terrarium-stars').exists()).toBe(true)
    expect(wrapper.find('.widget-terrarium-moon').exists()).toBe(true)
    expect(wrapper.find('.widget-terrarium-lightning').exists()).toBe(true)
    expect(wrapper.find('.widget-terrarium-fireflies').exists()).toBe(true)

    await wrapper.setProps({
      condition: '小雨',
      temperature: 18,
      weatherForecast: ['现在 18°', '15时 17°', '16时 16°'],
    })
    expect(wrapper.attributes('data-weather-state')).toBe('rain')
    expect(wrapper.classes()).toContain('is-weather-rain')
    expect(wrapper.text()).toContain('现在 18°')
    expect(wrapper.get('.widget-terrarium-scene').attributes('src')).toContain(
      'widgets/weather-terrarium/weather-terrarium-rain-scene.webp',
    )

    await wrapper.setProps({ condition: 'Clear night', weatherIsNight: true })
    expect(wrapper.attributes('data-weather-state')).toBe('night')
    expect(wrapper.classes()).toContain('is-weather-night')
    expect(wrapper.get('.widget-terrarium-scene').attributes('src')).toContain(
      'widgets/weather-terrarium/weather-terrarium-night-scene.webp',
    )

    await wrapper.setProps({ weatherState: 'cloudy' })
    expect(wrapper.attributes('data-weather-state')).toBe('cloudy')
    expect(wrapper.classes()).toContain('is-weather-cloudy')
    expect(wrapper.get('.widget-terrarium-scene').attributes('src')).toContain(
      'widgets/weather-terrarium/weather-terrarium-cloudy-scene.webp',
    )
  })
})
