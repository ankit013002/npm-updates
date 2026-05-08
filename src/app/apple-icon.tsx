import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          borderRadius: 40,
        }}
      >
        {/* Package box */}
        <div
          style={{
            width: 110,
            height: 110,
            border: '10px solid #10b981',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Lid line */}
          <div
            style={{
              position: 'absolute',
              width: 110,
              height: 10,
              background: '#10b981',
              top: 35,
            }}
          />
          {/* Center divider */}
          <div
            style={{
              position: 'absolute',
              width: 10,
              height: 75,
              background: '#10b981',
              top: 45,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
