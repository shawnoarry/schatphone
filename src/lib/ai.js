export async function callAI({ messages, systemPrompt, outputJson = false, settings }) {
  if (!settings.api.key) {
    alert('请先在设置 -> API 接口中配置 Key！')
    throw new Error('No API Key')
  }

  if (settings.api.provider === 'gemini') {
    const baseUrl =
      settings.api.url ||
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent'
    const url = `${baseUrl}?key=${settings.api.key}`

    const geminiContents = messages.map((message) => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }],
    }))

    const payload = {
      contents: geminiContents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error('Gemini API Request Failed')
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  const url = settings.api.url || 'https://api.openai.com/v1/chat/completions'

  const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages]

  const payload = {
    model: settings.api.model || 'gpt-3.5-turbo',
    messages: fullMessages,
    temperature: 0.7,
    stream: false,
  }

  if (outputJson) {
    // Placeholder for models that support response_format.
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.api.key}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('OpenAI API Error', errText)
    throw new Error(`API Request Failed: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
