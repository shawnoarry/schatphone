export const HOME_WIDGET_SIZE_CLASS_MAP = Object.freeze({
  '1x1': 'col-span-1 row-span-1',
  '2x1': 'col-span-2 row-span-1',
  '2x2': 'col-span-2 row-span-2',
  '4x1': 'col-span-4 row-span-1',
  '4x2': 'col-span-4 row-span-2',
  '4x3': 'col-span-4 row-span-3',
  '4x4': 'col-span-4 row-span-4',
})

export const BUILT_IN_HOME_WIDGETS = Object.freeze([
  {
    id: 'weather',
    variant: 'weather',
    size: '2x2',
    icon: 'fas fa-cloud-sun',
    preview: 'weather',
    nameZh: '天气',
    nameEn: 'Weather',
  },
  {
    id: 'calendar',
    variant: 'calendar',
    size: '2x2',
    icon: 'fas fa-calendar-days',
    preview: 'calendar',
    nameZh: '日历',
    nameEn: 'Calendar',
  },
  {
    id: 'music',
    variant: 'music',
    size: '4x2',
    icon: 'fas fa-music',
    preview: 'music',
    nameZh: '音乐',
    nameEn: 'Music',
  },
  {
    id: 'system',
    variant: 'system',
    size: '2x2',
    icon: 'fas fa-sliders',
    preview: 'system',
    nameZh: '系统状态',
    nameEn: 'System Status',
  },
  {
    id: 'quick_heart',
    variant: 'heart',
    size: '1x1',
    icon: 'fas fa-heart',
    preview: 'heart',
    nameZh: '快捷爱心',
    nameEn: 'Quick Heart',
  },
  {
    id: 'quick_disc',
    variant: 'disc',
    size: '1x1',
    icon: 'fas fa-compact-disc',
    preview: 'disc',
    nameZh: '快捷唱片',
    nameEn: 'Quick Disc',
  },
])

export const BUILT_IN_HOME_WIDGET_BY_ID = Object.freeze(
  Object.fromEntries(BUILT_IN_HOME_WIDGETS.map((widget) => [widget.id, widget])),
)

export const BUILT_IN_HOME_WIDGET_BY_VARIANT = Object.freeze(
  Object.fromEntries(BUILT_IN_HOME_WIDGETS.map((widget) => [widget.variant, widget])),
)

export const HOME_WIDGET_REGISTRY_ENTRIES = Object.freeze(
  Object.fromEntries(
    BUILT_IN_HOME_WIDGETS.map((widget) => [
      widget.id,
      Object.freeze({
        kind: 'widget',
        variant: widget.variant,
        span: HOME_WIDGET_SIZE_CLASS_MAP[widget.size],
      }),
    ]),
  ),
)
