import { ImageResponse } from 'next/og';
import OGImage, { alt as ogAlt, size as ogSize, contentType as ogContentType } from './opengraph-image';

export const runtime = 'edge';
export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogContentType;

export default function TwitterImage(): Promise<ImageResponse> {
  return OGImage();
}
