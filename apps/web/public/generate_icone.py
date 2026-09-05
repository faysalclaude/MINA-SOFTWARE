"""
Generates the two PWA icon files MINA TEACHER needs.
Run this once from the apps/web/public folder:

    pip install Pillow
    python generate_icons.py

This creates icon-192.png and icon-512.png in the current folder.
"""
from PIL import Image, ImageDraw, ImageFont


def make_icon(size, path):
    img = Image.new('RGB', (size, size), '#1F4B3F')
    draw = ImageDraw.Draw(img)
    pad = size * 0.22
    draw.rectangle(
        [pad, pad, size - pad, size - pad],
        outline='#FAF6EC',
        width=max(2, int(size * 0.05))
    )
    try:
        # Common on Windows; falls back to default if not found.
        font = ImageFont.truetype('arialbd.ttf', int(size * 0.4))
    except Exception:
        try:
            font = ImageFont.truetype(
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                int(size * 0.4)
            )
        except Exception:
            font = ImageFont.load_default()

    text = 'M'
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - w) / 2 - bbox[0], (size - h) / 2 - bbox[1]),
        text, fill='#FAF6EC', font=font
    )
    img.save(path)


make_icon(192, 'icon-192.png')
make_icon(512, 'icon-512.png')
print('Created icon-192.png and icon-512.png')