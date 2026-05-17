const translate = (t, entry) => {
  if (!entry) return ''
  const [zh, en] = entry
  return typeof t === 'function' ? t(zh, en) : zh
}

const MODULE_LABELS = {
  chat: ['聊天', 'Chat'],
  network: ['网络', 'Network'],
  storage: ['存储', 'Storage'],
  push: ['推送', 'Push'],
  map: ['地图', 'Map'],
  shopping: ['购物', 'Shopping'],
  simulation: ['事件模拟', 'Simulation'],
}

const ACTION_LABELS = {
  fetch_models: ['拉取模型列表', 'Fetch model list'],
  chat_smoke_test: ['Chat 烟测调用', 'Chat smoke test'],
  call_ai: ['调用 AI', 'Call AI'],
  reroll_reply: ['重生成回复', 'Reroll reply'],
  auto_invoke: ['自动调用', 'Autonomous invoke'],
  audit_storage: ['检查存储一致性', 'Audit storage consistency'],
  repair_storage: ['修复存储不同步', 'Repair storage drift'],
  export_backup: ['导出备份', 'Export backup'],
  import_backup: ['导入备份', 'Import backup'],
  subscribe: ['订阅真推送', 'Subscribe real push'],
  unsubscribe: ['取消真推送', 'Unsubscribe real push'],
  test: ['发送测试推送', 'Send test push'],
  relay_notification: ['转发系统通知', 'Relay system notification'],
  health_check: ['检查推送服务', 'Check push service'],
  resync: ['重同步订阅', 'Resync subscription'],
  schedule: ['安排定时推送', 'Schedule push delivery'],
  cancel_schedule: ['取消定时推送', 'Cancel scheduled push'],
  run_event_tick: ['运行事件 tick', 'Run event tick'],
}

const REASON_LABELS = {
  MISSING_URL: ['缺少接口地址', 'Missing endpoint URL'],
  NO_API_KEY: ['缺少 API Key', 'Missing API key'],
  STORAGE_HEALTHY: ['存储状态健康', 'Storage is healthy'],
  STORAGE_MIRROR_DRIFT: ['存储层不同步', 'Storage mirror drift detected'],
  STORAGE_LAYER_INVALID: ['存储层数据异常', 'Invalid payload in storage layer'],
  STORAGE_REPAIR_DONE: ['存储修复完成', 'Storage repair completed'],
  STORAGE_REPAIR_NOOP: ['无需修复', 'No repair needed'],
  STORAGE_REPAIR_PARTIAL: ['存储修复部分失败', 'Storage repair partially failed'],
  SIMULATION_TICK_TRIGGERED: ['事件 tick 已触发', 'Simulation tick triggered'],
  SIMULATION_TICK_SKIPPED: ['事件 tick 已跳过', 'Simulation tick skipped'],
  BACKUP_EXPORT_METADATA_ONLY: ['备份导出成功（元数据）', 'Backup export succeeded (metadata)'],
  BACKUP_EXPORT_WITH_ASSET_PACKAGE: ['备份导出成功（含素材包）', 'Backup export succeeded (with asset package)'],
  BACKUP_EXPORT_WITH_ASSET_PACKAGE_PARTIAL: [
    '备份导出完成（素材包部分缺失）',
    'Backup export completed (asset package partial)',
  ],
  BACKUP_EXPORT_FAILED: ['备份导出失败', 'Backup export failed'],
  BACKUP_IMPORT_METADATA_ONLY: ['备份导入成功（元数据）', 'Backup import succeeded (metadata)'],
  BACKUP_IMPORT_WITH_ASSET_PACKAGE: ['备份导入成功（含素材包）', 'Backup import succeeded (with asset package)'],
  BACKUP_IMPORT_ASSET_PACKAGE_PARTIAL: [
    '备份导入部分成功（素材包有失败）',
    'Backup import partially succeeded (asset package failures)',
  ],
  BACKUP_IMPORT_INVALID_JSON: ['备份导入失败（JSON 无效）', 'Backup import failed (invalid JSON)'],
  BACKUP_IMPORT_INVALID_FORMAT: ['备份导入失败（文件格式无效）', 'Backup import failed (invalid file format)'],
  BACKUP_IMPORT_UNSUPPORTED_SCHEMA: ['备份导入失败（版本过高）', 'Backup import failed (unsupported schema)'],
  BACKUP_IMPORT_STRUCTURE_UNSUPPORTED: ['备份导入失败（结构不支持）', 'Backup import failed (unsupported structure)'],
  BACKUP_IMPORT_FAILED: ['备份导入失败', 'Backup import failed'],
  SERVER_URL_MISSING: ['缺少 Push Server 地址', 'Push server URL missing'],
  CONFIG_MISSING: ['推送配置不完整', 'Push configuration incomplete'],
  DELIVER_AT_INVALID: ['计划时间无效', 'Scheduled time is invalid'],
  PUBLIC_KEY_MISSING: ['推送公钥不可用', 'Push public key unavailable'],
  PUBLIC_KEY_FAILED: ['推送公钥不可用', 'Push public key unavailable'],
  PERMISSION_DENIED: ['系统通知权限未授权', 'System notification permission not granted'],
  PERMISSION_NOT_GRANTED: ['系统通知权限未授权', 'System notification permission not granted'],
  UNSUPPORTED: ['当前环境不支持真推送', 'Real push unsupported here'],
  SUBSCRIPTION_MISSING: ['浏览器本地订阅不存在', 'Browser subscription missing'],
  SUBSCRIPTION_NOT_FOUND: ['服务端未找到该设备订阅', 'Server subscription record missing'],
  SUBSCRIPTION_EXPIRED: ['推送订阅已失效', 'Push subscription expired'],
  SUBSCRIPTION_READ_FAILED: ['读取浏览器订阅失败', 'Failed to read browser subscription'],
  FETCH_UNAVAILABLE: ['无法连接 Push Server', 'Unable to reach Push Server'],
  NETWORK_ERROR: ['无法连接 Push Server', 'Unable to reach Push Server'],
  INVALID_URL: ['接口地址格式错误', 'Invalid endpoint URL'],
  TIMEOUT: ['请求超时', 'Request timeout'],
  NETWORK: ['网络或跨域问题', 'Network or CORS issue'],
  PARSE_ERROR: ['响应格式解析失败', 'Response parsing failed'],
  CANCELED: ['请求被取消', 'Request canceled'],
  HTTP_ERROR: ['HTTP 请求失败', 'HTTP request failed'],
}

const SUGGESTION_LABELS = {
  MISSING_URL: ['请先填写 API 接口 URL。', 'Please fill in API endpoint URL first.'],
  NO_API_KEY: ['请在本页补全 API Key。', 'Please fill in API key on this page.'],
  STORAGE_HEALTHY: ['当前存储层状态正常，无需操作。', 'Storage layers are healthy; no action required.'],
  STORAGE_MIRROR_DRIFT: ['可在设置-关于执行一键修复。', 'Run one-click repair in Settings > About.'],
  STORAGE_LAYER_INVALID: ['建议先导出备份，再执行修复与重检。', 'Export backup first, then run repair and re-audit.'],
  STORAGE_REPAIR_DONE: ['建议再次执行检查确认一致性。', 'Run audit again to verify consistency.'],
  STORAGE_REPAIR_NOOP: ['当前无不同步项，可继续正常使用。', 'No drift found; continue normal usage.'],
  STORAGE_REPAIR_PARTIAL: ['查看报告后重试，必要时导出并恢复备份。', 'Review report and retry; export/restore backup if needed.'],
  SIMULATION_TICK_TRIGGERED: [
    '事件 tick 已触发安全 pilot，可在事件日志或相关模块中查看结果。',
    'The event tick triggered a safe pilot; review event logs or the related module for results.',
  ],
  SIMULATION_TICK_SKIPPED: [
    '本次 tick 未触发事件，通常是 Surprise Mode、冷却、每日上限或无活跃订单导致。',
    'This tick did not trigger an event, usually due to Surprise Mode, cooldowns, daily caps, or no active order.',
  ],
  BACKUP_EXPORT_METADATA_ONLY: [
    '这是轻量备份，恢复时不含本地素材二进制。',
    'This is a lightweight backup and does not include local binary assets.',
  ],
  BACKUP_EXPORT_WITH_ASSET_PACKAGE: [
    '已导出素材包，建议同时保留近期元数据备份。',
    'Asset package exported. Keep a recent metadata backup as well.',
  ],
  BACKUP_EXPORT_WITH_ASSET_PACKAGE_PARTIAL: [
    '素材包未完整打包，请留意导出提示中的跳过/缺失数量。',
    'Asset package is partial; check skipped/missing counts in export feedback.',
  ],
  BACKUP_EXPORT_FAILED: ['请检查浏览器存储权限后重试导出。', 'Check browser storage permissions and retry export.'],
  BACKUP_IMPORT_METADATA_ONLY: [
    '已恢复元数据；若需本地素材，请导入含素材包的备份。',
    'Metadata restored. Import a backup with asset package if local media is needed.',
  ],
  BACKUP_IMPORT_WITH_ASSET_PACKAGE: [
    '建议检查相册预览是否正常并执行一次手动备份。',
    'Check gallery preview and run one manual backup after import.',
  ],
  BACKUP_IMPORT_ASSET_PACKAGE_PARTIAL: [
    '部分素材包恢复失败，可在相册中重新导入缺失素材。',
    'Some asset package items failed; re-import missing assets in Gallery.',
  ],
  BACKUP_IMPORT_INVALID_JSON: ['请确认选择的是 JSON 备份文件。', 'Please make sure the selected file is a JSON backup file.'],
  BACKUP_IMPORT_INVALID_FORMAT: ['请使用系统导出的备份文件重试。', 'Retry with a backup file exported by this system.'],
  BACKUP_IMPORT_UNSUPPORTED_SCHEMA: [
    '该备份来自更高版本，请升级应用后再导入。',
    'This backup is from a newer version. Upgrade app before importing.',
  ],
  BACKUP_IMPORT_STRUCTURE_UNSUPPORTED: [
    '备份结构不完整，建议重新导出后再导入。',
    'Backup structure is incomplete; re-export and import again.',
  ],
  BACKUP_IMPORT_FAILED: ['导入失败已回滚，请检查备份文件结构后重试。', 'Import failed and rolled back. Validate backup file structure and retry.'],
  SERVER_URL_MISSING: [
    '前往设置-通知，先填写可访问的 Push Server 地址。',
    'Open Settings > Notifications and enter a reachable Push Server URL.',
  ],
  CONFIG_MISSING: [
    '先完成服务地址与设备订阅，再尝试发送推送。',
    'Complete server URL and device subscription before sending push.',
  ],
  DELIVER_AT_INVALID: [
    '请检查计划触发时间，确保它是有效的未来时间戳。',
    'Check the scheduled trigger time and make sure it is a valid future timestamp.',
  ],
  PUBLIC_KEY_MISSING: [
    '检查 Push Server 是否已生成并暴露 VAPID 公钥。',
    'Check whether the Push Server exposes a valid VAPID public key.',
  ],
  PUBLIC_KEY_FAILED: [
    '检查 Push Server 是否已生成并暴露 VAPID 公钥。',
    'Check whether the Push Server exposes a valid VAPID public key.',
  ],
  PERMISSION_DENIED: [
    '到浏览器或系统设置里允许通知权限，然后重新订阅。',
    'Allow browser/system notification permission, then subscribe again.',
  ],
  PERMISSION_NOT_GRANTED: [
    '到浏览器或系统设置里允许通知权限，然后重新订阅。',
    'Allow browser/system notification permission, then subscribe again.',
  ],
  UNSUPPORTED: [
    '请使用支持 Service Worker/Push 的 HTTPS 或 localhost 环境。',
    'Use HTTPS or localhost in a browser that supports Service Worker and Push.',
  ],
  SUBSCRIPTION_MISSING: [
    '在设置-通知执行“重同步订阅”或重新订阅真推送。',
    'Use “Resync subscription” in Settings > Notifications or subscribe again.',
  ],
  SUBSCRIPTION_NOT_FOUND: [
    '服务端记录已丢失，前往设置-通知执行“重同步订阅”。',
    'Server record is missing. Go to Settings > Notifications and run “Resync subscription”.',
  ],
  SUBSCRIPTION_EXPIRED: [
    '当前订阅已过期，建议取消后重新订阅真推送。',
    'Current subscription expired. Unsubscribe then subscribe again.',
  ],
  SUBSCRIPTION_READ_FAILED: [
    '刷新页面后重试；若仍失败，可重新订阅真推送。',
    'Reload and retry. If it still fails, subscribe to real push again.',
  ],
  FETCH_UNAVAILABLE: [
    '确认 Push Server 正在运行，且当前网络可访问该地址。',
    'Make sure the Push Server is running and reachable from the current network.',
  ],
  NETWORK_ERROR: [
    '确认 Push Server 正在运行，且当前网络可访问该地址。',
    'Make sure the Push Server is running and reachable from the current network.',
  ],
  INVALID_URL: ['检查 URL 是否完整且包含正确路径。', 'Check endpoint URL and verify full path.'],
  TIMEOUT: ['检查网络后重试，必要时更换网关。', 'Check network and retry; switch gateway if needed.'],
  NETWORK: ['优先检查网络与跨域代理设置。', 'Check network first, then CORS/proxy settings.'],
  PARSE_ERROR: ['确认返回内容是有效 JSON。', 'Ensure upstream response is valid JSON.'],
  CANCELED: ['这是手动取消记录，无需处理。', 'This is a manual cancel record; no action needed.'],
}

const normalizeCode = (item) => (item?.code || '').toUpperCase()

const getStatusCode = (item) => Number(item?.statusCode || 0)

export const getNetworkReportModuleLabel = (moduleKey, t) =>
  translate(t, MODULE_LABELS[moduleKey]) || translate(t, ['未知模块', 'Unknown module'])

export const getNetworkReportActionLabel = (actionKey, t) =>
  translate(t, ACTION_LABELS[actionKey]) || actionKey || translate(t, ['未知动作', 'Unknown action'])

export const getNetworkReportReasonLabel = (item, t) => {
  const code = normalizeCode(item)
  const statusCode = getStatusCode(item)
  const directLabel = translate(t, REASON_LABELS[code])

  if (directLabel) return directLabel
  if (code === 'AUTH' || statusCode === 401 || statusCode === 403) {
    return translate(t, ['鉴权失败（401/403）', 'Authentication failed (401/403)'])
  }
  if (code === 'NOT_FOUND' || statusCode === 404) {
    return translate(t, ['接口不存在（404）', 'Endpoint not found (404)'])
  }
  if (code === 'RATE_LIMIT' || statusCode === 429) {
    return translate(t, ['请求过于频繁（429）', 'Rate limit exceeded (429)'])
  }
  if (code === 'SERVER' || statusCode >= 500) {
    return translate(t, ['服务端异常（5xx）', 'Server error (5xx)'])
  }
  return translate(t, ['未分类问题', 'Unclassified issue'])
}

export const getNetworkReportSuggestionLabel = (item, t) => {
  const code = normalizeCode(item)
  const statusCode = getStatusCode(item)
  const directLabel = translate(t, SUGGESTION_LABELS[code])

  if (directLabel) return directLabel
  if (code === 'AUTH' || statusCode === 401 || statusCode === 403) {
    return translate(t, ['更换可用 Key，或检查供应商权限设置。', 'Use a valid key or verify provider permissions.'])
  }
  if (code === 'NOT_FOUND' || statusCode === 404) {
    return translate(t, ['确认网关地址或接口路径是否正确。', 'Confirm gateway address and endpoint path.'])
  }
  if (code === 'RATE_LIMIT' || statusCode === 429) {
    return translate(t, ['稍后重试，或切换到其他供应商。', 'Retry later or switch to another provider.'])
  }
  if (code === 'SERVER' || statusCode >= 500) {
    return translate(t, ['属于服务端问题，建议稍后再试。', 'Server-side issue. Retry later.'])
  }
  return translate(t, ['可先复制报告并排查 URL/Key/模型三项。', 'Copy report and verify URL, key, and model first.'])
}

export const createNetworkReportLabels = (t) => ({
  moduleLabel: (moduleKey) => getNetworkReportModuleLabel(moduleKey, t),
  actionLabel: (actionKey) => getNetworkReportActionLabel(actionKey, t),
  reportReasonLabel: (item) => getNetworkReportReasonLabel(item, t),
  reportSuggestionLabel: (item) => getNetworkReportSuggestionLabel(item, t),
})
