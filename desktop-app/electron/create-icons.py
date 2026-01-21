#!/usr/bin/env python3
"""
Generate placeholder icons for HavenAI desktop app.

Run this script to create basic PNG icons. For production,
you should create proper icons in all required sizes.
"""

import struct
import zlib
import os

def create_png(width, height, color=(14, 165, 233)):
    """Create a simple solid color PNG."""
    
    def png_chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk (image data)
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # Filter byte
        for x in range(width):
            # Create a simple shield shape
            cx, cy = width // 2, height // 2
            dx = abs(x - cx) / (width // 2)
            dy = (y - height * 0.2) / (height * 0.7)
            
            # Shield shape
            if dy >= 0 and dy <= 1:
                shield_width = 1 - dy * 0.5
                if dx <= shield_width * 0.8:
                    raw_data += bytes(color)
                else:
                    raw_data += b'\x11\x18\x27'  # Background
            else:
                raw_data += b'\x11\x18\x27'  # Background
    
    compressed = zlib.compress(raw_data)
    idat = png_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = png_chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(script_dir, 'assets')
    os.makedirs(assets_dir, exist_ok=True)
    
    # Create main icon (512x512)
    icon_path = os.path.join(assets_dir, 'icon.png')
    with open(icon_path, 'wb') as f:
        f.write(create_png(512, 512))
    print(f"Created: {icon_path}")
    
    # Create tray icon (32x32)
    tray_path = os.path.join(assets_dir, 'tray.png')
    with open(tray_path, 'wb') as f:
        f.write(create_png(32, 32))
    print(f"Created: {tray_path}")
    
    # Create tray template for Mac (32x32, white)
    tray_template_path = os.path.join(assets_dir, 'trayTemplate.png')
    with open(tray_template_path, 'wb') as f:
        f.write(create_png(32, 32, color=(255, 255, 255)))
    print(f"Created: {tray_template_path}")
    
    print("\nPlaceholder icons created!")
    print("For production, replace these with proper icons.")


if __name__ == '__main__':
    main()
