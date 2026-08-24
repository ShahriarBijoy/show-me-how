import sharp from 'sharp';

export async function whitePng(path, w = 640, h = 360) {
  await sharp({ create: { width: w, height: h, channels: 3, background: '#ffffff' } }).png().toFile(path);
  return path;
}
