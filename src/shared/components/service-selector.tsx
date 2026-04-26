import type { VNode } from 'preact'
import { useState } from 'preact/hooks'

import type { Service } from '../services/types'

export function ServiceSelector<S extends Service>({
  services,
  selected,
  onSelect,
}: Readonly<{
  services: S[]
  selected: S | undefined
  onSelect: (service: S) => void
}>): VNode {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        justifyContent: 'center',
      }}
    >
      {services.map((service) => (
        <ServiceButton
          key={service.id}
          service={service}
          isSelected={service.id === selected?.id}
          onClick={() => onSelect(service)}
        />
      ))}
    </div>
  )
}

function ServiceButton<S extends Service>({
  service,
  isSelected,
  onClick,
}: Readonly<{
  service: S
  isSelected: boolean
  onClick: () => void
}>) {
  const [isHovered, setHovered] = useState<boolean>(false)

  const selectedOpacity = isHovered ? 1 : 0.8
  const unselectedOpacity = isHovered ? 0.3 : 0.2
  const opacity = isSelected ? selectedOpacity : unselectedOpacity

  return (
    <button
      type='button'
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        margin: 0,
        color: 'var(--mono-3)',
        fontSize: 0,
        background: 'none',
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
        opacity,
        transition: 'opacity 0.2s',
      }}
      title={service.name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {service.icon({ title: service.name })}
    </button>
  )
}
