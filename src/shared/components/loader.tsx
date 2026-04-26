import type { CSSProperties, SVGAttributes } from 'preact'
import { useEffect } from 'preact/hooks'

import LoaderIcon from '../icons/loader'

export function Loader({
  className,
  ...properties
}: Omit<SVGAttributes<SVGSVGElement>, 'className' | 'style'> & {
  className?: string
  style?: CSSProperties
}) {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = keyframes
    document.head.appendChild(style)

    return () => {
      style.remove()
    }
  }, [])

  return (
    <LoaderIcon
      className={className}
      {...properties}
      style={{
        ...properties.style,
        color: 'var(--mono-5)',
        animation: 'spin 1.5s linear infinite',
      }}
    />
  )
}

const keyframes = `
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`
