import type { FocusConfig } from '@/data/types'
import { SLIDE_PURPLE } from './SlideFrame'
import { useStorageImage } from './useStorageImage'

const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const

/** Full-bleed image with a badge pill at the top and the title at the bottom over a gradient. */
export function FocusSlide({ config }: { config: FocusConfig }) {
  const image = useStorageImage(config.image_path)

  return (
    <>
      {image.status === 'ready' && image.url ? (
        <img src={image.url} alt="" style={{ ...fill, objectFit: 'cover' }} />
      ) : (
        <div style={{ ...fill, background: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {image.status !== 'loading' && (
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 44, color: '#f3f4f6' }}>Image unavailable</span>
          )}
        </div>
      )}
      <div style={{ ...fill, background: 'linear-gradient(to bottom, transparent 50%, rgba(30, 6, 60, 0.85) 100%)' }} />
      {config.badge && (
        <div style={{ position: 'absolute', top: 70, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <span
            style={{
              maxWidth: 900,
              padding: '14px 48px',
              borderRadius: 999,
              background: SLIDE_PURPLE,
              color: '#fff',
              fontSize: 60,
              lineHeight: 1.15,
              textTransform: 'uppercase',
              textAlign: 'center',
              overflowWrap: 'anywhere',
            }}
          >
            {config.badge}
          </span>
        </div>
      )}
      <h1
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          bottom: 80,
          margin: 0,
          color: '#fff',
          fontSize: 110,
          lineHeight: 1.05,
          textTransform: 'uppercase',
          textAlign: 'center',
          overflowWrap: 'anywhere',
        }}
      >
        {config.title}
      </h1>
    </>
  )
}
