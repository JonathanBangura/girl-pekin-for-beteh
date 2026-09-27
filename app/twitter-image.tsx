import { ImageResponse } from 'next/og'

export const alt =
  'Girl Pikin For Betteh Foundation — programmes, awards and events'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0b2d28',
          color: '#ffffff',
          padding: '72px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#ffffff',
              color: '#0b2d28',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '24px',
            }}
          >
            GPFB
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: '26px',
              letterSpacing: '0.04em',
              fontWeight: 700,
            }}
          >
            GIRL PIKIN FOR BETTEH FOUNDATION
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '980px',
            gap: '22px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '64px',
              lineHeight: 1.05,
              fontWeight: 800,
            }}
          >
            Programmes, Awards, Events & Public Participation
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: '28px',
              lineHeight: 1.35,
              color: '#e7f1ee',
            }}
          >
            The official Girl Pikin For Betteh Foundation platform
            in Sierra Leone.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '22px',
            color: '#d8e5e1',
          }}
        >
          girlpikinforbetteh.org
        </div>
      </div>
    ),
    size,
  )
}
