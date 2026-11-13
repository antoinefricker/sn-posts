import type { ReactNode, Ref } from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/lib/slides'

export const SLIDE_PURPLE = '#5b1fa0'
export const SLIDE_LAVENDER = '#b3a3ef'
const SLIDE_FONT = "'Anton', 'Arial Narrow', sans-serif"

/** Fixed 1080×1350 box. `scale` shrinks it for previews; the ref points at the unscaled inner box. */
export function SlideFrame({ children, scale = 1, ref }: { children: ReactNode; scale?: number; ref?: Ref<HTMLDivElement> }) {
  return (
    <div style={{ width: SLIDE_WIDTH * scale, height: SLIDE_HEIGHT * scale, overflow: 'hidden', flexShrink: 0 }}>
      <div
        ref={ref}
        style={{
          position: 'relative',
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          overflow: 'hidden',
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: 'top left',
          fontFamily: SLIDE_FONT,
          color: SLIDE_PURPLE,
          backgroundColor: '#f1edf7',
        }}
      >
        {children}
      </div>
    </div>
  )
}
