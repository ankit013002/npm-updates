import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#030712',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 96,
        }}
      >
        {/* Package box */}
        <div
          style={{
            width: 300,
            height: 300,
            border: '28px solid #10b981',
            borderRadius: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Lid line */}
          <div
            style={{
              position: 'absolute',
              width: 300,
              height: 28,
              background: '#10b981',
              top: 106,
            }}
          />
          {/* Center divider */}
          <div
            style={{
              position: 'absolute',
              width: 28,
              height: 194,
              background: '#10b981',
              top: 134,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
