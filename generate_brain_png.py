from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

size = (512, 512)
background = (15, 23, 42)
brain_color = (124, 58, 237)
stroke_color = (192, 132, 252)
text_color = (255, 255, 255)

img = Image.new("RGB", size, background)
draw = ImageDraw.Draw(img)
center = (256, 220)

# Brain lobes
for dx, dy, w, h in [(-95, -45, 120, 110), (0, -65, 130, 130), (95, -45, 120, 110)]:
    bbox = [center[0] + dx, center[1] + dy, center[0] + dx + w, center[1] + dy + h]
    draw.ellipse(bbox, fill=brain_color)

# Brain lower shape
lower = [center[0] - 110, center[1] + 10, center[0] + 110, center[1] + 170]
draw.pieslice(lower, start=0, end=180, fill=brain_color)
draw.arc(lower, start=0, end=180, fill=stroke_color, width=10)

# Stylized lines inside brain
for y in range(190, 280, 24):
    draw.line(
        [
            (center[0] - 70, y),
            (center[0] - 30, y + 16),
            (center[0] + 30, y + 10),
            (center[0] + 70, y + 26),
        ],
        fill=stroke_color,
        width=7,
    )

# Add gradient highlight circles
highlight_color = (201, 163, 255, 120)
for dx, dy, r in [(-70, -20, 40), (40, -35, 34), (15, 10, 50)]:
    highlight = Image.new("RGBA", size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    hd.ellipse(
        [
            center[0] + dx - r,
            center[1] + dy - r,
            center[0] + dx + r,
            center[1] + dy + r,
        ],
        fill=highlight_color,
    )
    img = Image.alpha_composite(img.convert("RGBA"), highlight).convert("RGB")
    draw = ImageDraw.Draw(img)

# Text in the middle
try:
    font = ImageFont.truetype("arial.ttf", 40)
except Exception:
    font = ImageFont.load_default()
text = "iMemory"
try:
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
except AttributeError:
    text_w, text_h = draw.textsize(text, font=font)
text_pos = ((size[0] - text_w) // 2, 342)

block_pad = 16
block_box = [
    text_pos[0] - block_pad,
    text_pos[1] - block_pad,
    text_pos[0] + text_w + block_pad,
    text_pos[1] + text_h + block_pad,
]
draw.rounded_rectangle(block_box, radius=18, fill=(16, 24, 40))
draw.text(text_pos, text, fill=text_color, font=font)

out = Path("public/brain.png")
img.save(out, "PNG")
print(f"Created {out.resolve()} size={out.stat().st_size}")
