import { sanitizeWidgetAppearanceCode } from './widget-schema'

const CUSTOM_WIDGET_CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  'img-src data: blob: https: http:',
  'font-src data: https: http:',
  "connect-src 'none'",
  "media-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ')

export const buildCustomWidgetSrcDoc = (widget = {}) => {
  const rawCode = typeof widget.code === 'string' ? widget.code : ''
  const { code } = sanitizeWidgetAppearanceCode(rawCode)
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="${CUSTOM_WIDGET_CSP}" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif; }
      #widget-root { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="widget-root">${code}</div>
  </body>
</html>`
}
