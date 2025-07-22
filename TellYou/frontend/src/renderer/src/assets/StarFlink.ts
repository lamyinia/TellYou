export const randomStarStyle = (): Record<string, string | number> => {
  const top = Math.random() * 100
  const left = Math.random() * 100
  const size = Math.random() * 2 + 1
  const opacity = Math.random() * 0.5 + 0.5
  const delay = Math.random() * 2 // 0~2秒
  return {
    top: `${top}%`,
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    opacity,
    position: 'absolute',
    background: '#fff',
    borderRadius: '50%',
    pointerEvents: 'auto',
    zIndex: 1,
    filter: 'blur(0.5px)',
    '--star-delay': `${delay}s`
  }
}
