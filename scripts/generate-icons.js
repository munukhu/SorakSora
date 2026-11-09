const fs = require('fs');
const path = require('path');
const React = require('react');
const { ImageResponse } = require('next/og');

async function generate() {
  const publicDir = path.join(__dirname, '..', 'public');
  const appDir = path.join(__dirname, '..', 'src', 'app');

  // 1. Generate apple-touch-icon.png (180x180) with 100% transparent backdrop
  console.log('Generating transparent apple-touch-icon.png (180x180)...');
  const appleIconResponse = new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: '136px',
            height: '136px',
            backgroundColor: '#FFF066',
            border: '6px solid #1A1A1A',
            boxShadow: '10px 10px 0px #1A1A1A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '76px',
            fontWeight: '900',
            color: '#1A1A1A',
            fontFamily: 'sans-serif',
          },
        },
        'SS'
      )
    ),
    { width: 180, height: 180 }
  );

  const appleBuffer = Buffer.from(await appleIconResponse.arrayBuffer());
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleBuffer);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon-precomposed.png'), appleBuffer);
  console.log('apple-touch-icon.png generated:', appleBuffer.length, 'bytes');

  // 2. Generate 32x32 transparent favicon-32x32.png and favicon.ico
  console.log('Generating transparent favicon-32x32.png and favicon.ico...');
  const favicon32Response = new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: '24px',
            height: '24px',
            backgroundColor: '#FFF066',
            border: '2px solid #1A1A1A',
            boxShadow: '2px 2px 0px #1A1A1A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '900',
            color: '#1A1A1A',
            fontFamily: 'sans-serif',
          },
        },
        'SS'
      )
    ),
    { width: 32, height: 32 }
  );

  const favicon32Buffer = Buffer.from(await favicon32Response.arrayBuffer());
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), favicon32Buffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), favicon32Buffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon32Buffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), favicon32Buffer);
  console.log('favicon-32x32.png & favicon.ico generated:', favicon32Buffer.length, 'bytes');

  // 3. Generate 16x16 transparent favicon-16x16.png
  console.log('Generating transparent favicon-16x16.png...');
  const favicon16Response = new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: '12px',
            height: '12px',
            backgroundColor: '#FFF066',
            border: '1px solid #1A1A1A',
            boxShadow: '1px 1px 0px #1A1A1A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '7px',
            fontWeight: '900',
            color: '#1A1A1A',
            fontFamily: 'sans-serif',
          },
        },
        'SS'
      )
    ),
    { width: 16, height: 16 }
  );

  const favicon16Buffer = Buffer.from(await favicon16Response.arrayBuffer());
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), favicon16Buffer);
  console.log('favicon-16x16.png generated:', favicon16Buffer.length, 'bytes');

  // 4. Generate og-image.png (1200x630)
  console.log('Generating og-image.png...');
  const ogResponse = new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF9F5',
          padding: '48px 64px',
          fontFamily: 'sans-serif',
          position: 'relative',
        },
      },
      // Header brand pill
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              width: '54px',
              height: '54px',
              backgroundColor: '#FFF066',
              border: '4px solid #1A1A1A',
              boxShadow: '4px 4px 0px #1A1A1A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: '900',
              color: '#1A1A1A',
            },
          },
          'SS'
        ),
        React.createElement(
          'span',
          {
            style: {
              fontSize: '36px',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#1A1A1A',
            },
          },
          'SORAKSORA!'
        ),
        React.createElement(
          'span',
          {
            style: {
              fontSize: '24px',
              fontWeight: '700',
              color: '#666666',
            },
          },
          '— The Cheer Wall'
        )
      ),
      // Central Neobrutalist quote card
      React.createElement(
        'div',
        {
          style: {
            width: '980px',
            backgroundColor: '#FEF9C3',
            border: '4.5px solid #1A1A1A',
            boxShadow: '16px 16px 0px #1A1A1A',
            padding: '44px 56px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          },
        },
        // Pin
        React.createElement('div', {
          style: {
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '40px',
            borderRadius: '9999px',
            backgroundColor: '#EF4444',
            border: '3.5px solid #1A1A1A',
            boxShadow: '3px 3px 0px #1A1A1A',
          },
        }),
        React.createElement(
          'div',
          {
            style: {
              fontSize: '38px',
              fontWeight: '900',
              color: '#1A1A1A',
              lineHeight: '1.35',
              marginBottom: '24px',
            },
          },
          '“Sebarkan energi & kata-kata penyemangatmu di papan dukungan digital.”'
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: '20px',
              fontWeight: '700',
              color: '#555555',
              display: 'flex',
              alignItems: 'center',
              borderTop: '2.5px solid rgba(26,26,26,0.15)',
              paddingTop: '20px',
            },
          },
          React.createElement('span', null, '💛 Ruang hangat untuk saling menguatkan & berbagi inspirasi')
        )
      )
    ),
    { width: 1200, height: 630 }
  );

  const ogBuffer = Buffer.from(await ogResponse.arrayBuffer());
  fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogBuffer);
  fs.writeFileSync(path.join(publicDir, 'og-banner.png'), ogBuffer);
  console.log('og-image.png generated:', ogBuffer.length, 'bytes');

  console.log('All transparent icons generated successfully!');
}

generate().catch(console.error);
