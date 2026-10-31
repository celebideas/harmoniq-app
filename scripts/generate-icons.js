import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(size, bgHex, primaryHex) {
  // Simple uncompressed or deflated RGBA PNG generator
  const width = size;
  const height = size;

  // Helper to parse hex
  const parseHex = (hex) => {
    hex = hex.replace('#', '');
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
      255
    ];
  };

  const bg = parseHex(bgHex);
  const fg = parseHex(primaryHex);
  const white = [255, 255, 255, 255];
  const lime = [163, 230, 53, 255]; // #a3e635

  const rawData = Buffer.alloc((width * 4 + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.42;
  const innerR = width * 0.16;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let color = bg;

      // Rounded app container squircle or circle
      if (dist < outerR) {
        // Vinyl grooves effect + central radio pulse
        const groove = Math.floor(dist) % Math.floor(width * 0.05);
        if (dist > innerR * 1.5 && groove < 2) {
          color = [28, 28, 28, 255];
        } else {
          color = [18, 18, 18, 255];
        }

        // Center hub
        if (dist <= innerR * 1.3) {
          color = lime;
          // Radio center wave dot
          if (dist <= innerR * 0.45) {
            color = [10, 10, 10, 255];
          }
        }
      }

      rawData[pxOffset] = color[0];
      rawData[pxOffset + 1] = color[1];
      rawData[pxOffset + 2] = color[2];
      rawData[pxOffset + 3] = color[3];
    }
  }

  // PNG structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(8 + len + 4);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const typeAndData = chunk.subarray(4, 8 + len);
    chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
    return chunk;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write 192 and 512 png icons
const png192 = createPNG(192, '#0a0a0a', '#a3e635');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);

const png512 = createPNG(512, '#0a0a0a', '#a3e635');
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

// Also write maskable 512
const pngMaskable = createPNG(512, '#0a0a0a', '#a3e635');
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), pngMaskable);

// Also write SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#0a0a0a"/>
  <circle cx="256" cy="256" r="200" fill="#141414" stroke="#262626" stroke-width="8"/>
  <circle cx="256" cy="256" r="150" fill="#171717" stroke="#262626" stroke-width="6"/>
  <circle cx="256" cy="256" r="100" fill="#1c1c1c" stroke="#262626" stroke-width="4"/>
  <circle cx="256" cy="256" r="64" fill="#a3e635"/>
  <circle cx="256" cy="256" r="24" fill="#0a0a0a"/>
  <path d="M190 256 A66 66 0 0 1 322 256" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
  <path d="M160 256 A96 96 0 0 1 352 256" fill="none" stroke="#a3e635" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

console.log('Icons generated successfully in public/');
