import type { Ref } from 'react'
import type { Slide } from '@/lib/slides'
import { FocusSlide } from './FocusSlide'
import { GamesSlide } from './GamesSlide'
import { IntroSlide } from './IntroSlide'
import { SlideFrame } from './SlideFrame'

export function SlideView({ slide, scale, ref }: { slide: Slide; scale?: number; ref?: Ref<HTMLDivElement> }) {
  return (
    <SlideFrame scale={scale} ref={ref}>
      {slide.kind === 'intro' && <IntroSlide config={slide.config} />}
      {slide.kind === 'focus' && <FocusSlide config={slide.config} />}
      {slide.kind === 'games' && <GamesSlide venue={slide.venue} days={slide.days} page={slide.page} pageCount={slide.pageCount} />}
    </SlideFrame>
  )
}
