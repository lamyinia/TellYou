import updateBg from '@renderer/assets/img/update_bg.png'

export const resolveAvatar = (url?: string): string => {
  if (!url || url.trim() === '') return updateBg
  try {
    // 允许 http/https 直链，处理包含中文或空格
    return encodeURI(url)
  } catch {
    return url
  }
}
export const onAvatarError = (e: Event): void => {
  const img = e.target as HTMLImageElement
  if (img && img.src !== updateBg) img.src = updateBg
}

export const formatTime = (t?: string): string => {
  if (!t) return ''
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return t
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

export const briefMsg = (s?: string): string => (s || '').replace(/\n/g, ' ').slice(0, 40)

export const getMessageId = (): string => {
  const time = BigInt(Date.now())
  const rand = BigInt(Math.floor(Math.random() * 1_000_000))
  return ((time << 20n) | rand).toString()
}
