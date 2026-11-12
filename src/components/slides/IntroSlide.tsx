import defaultBackground from '@/assets/slide-background.svg'
import type { IntroConfig } from '@/data/types'
import { SLIDE_PURPLE } from './SlideFrame'
import { useStorageImage } from './useStorageImage'

/** Background image (stored, or the default when unset or missing) under a translucent overlay, with title and subtitle. */
export function IntroSlide({ config }: { config: IntroConfig }) {
  const image = useStorageImage(config.background_path)
  const src = image.status === 'ready' ? image.url : image.status === 'loading' ? null : defaultBackground

  return (
    <>
      {src && <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(91, 31, 160, 0.35)' }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: 90,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 40,
          textAlign: 'center',
          color: '#fff',
          overflowWrap: 'anywhere',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 150,
            lineHeight: 1.05,
            textTransform: 'uppercase',
            WebkitTextStroke: `10px ${SLIDE_PURPLE}`,
            paintOrder: 'stroke fill',
          }}
        >
          {config.title}
        </h1>
        {config.subtitle && (
          <p style={{ margin: 0, fontSize: 64, lineHeight: 1.15, textTransform: 'uppercase', textShadow: '0 4px 18px rgba(40, 10, 80, 0.45)' }}>
            {config.subtitle}
          </p>
        )}
      </div>
    </>
  )
}
