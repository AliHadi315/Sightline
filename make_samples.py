"""Draws the synthetic sample / eval images with Pillow. Run once: python make_samples.py

Writes samples/{desk,sign,kitchen}.jpg and evals/frames/{desk,sign,kitchen,door,table}.jpg.
Replace them with real photos whenever you like; samples/cached.json and evals/expected.json
are keyed by filename.
"""
from PIL import Image, ImageDraw, ImageFont

import config

W, H = 960, 720


def font(size: int):
    for name in ("arial.ttf", "DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def canvas(wall, floor=None):
    img = Image.new("RGB", (W, H), wall)
    d = ImageDraw.Draw(img)
    if floor:
        d.rectangle((0, 430, W, H), fill=floor)
    return img, d


def desk():
    img, d = canvas((222, 224, 230), (150, 105, 60))
    d.rectangle((330, 230, 630, 440), fill=(35, 35, 40))                       # laptop lid
    d.rectangle((345, 245, 615, 425), fill=(70, 130, 200))                      # screen
    d.polygon([(300, 440), (660, 440), (700, 490), (260, 490)], fill=(60, 60, 65))  # keyboard base
    d.rectangle((720, 390, 805, 480), fill=(245, 245, 245))                     # mug
    d.arc((790, 405, 840, 465), 270, 90, fill=(245, 245, 245), width=9)         # handle
    d.rectangle((90, 450, 280, 580), fill=(240, 235, 205), outline=(120, 110, 90), width=3)  # notebook
    for y in range(475, 575, 16):
        d.line((110, y, 260, y), fill=(170, 170, 170), width=2)
    return img


def sign():
    img, d = canvas((190, 190, 195))
    d.rectangle((120, 70, 840, 650), fill=(252, 252, 250), outline=(25, 25, 25), width=6)
    d.text((165, 110), "EXIT", fill=(200, 30, 30), font=font(110))
    d.polygon([(480, 140), (640, 140), (640, 110), (720, 170), (640, 230), (640, 200), (480, 200)], fill=(200, 30, 30))
    d.text((165, 280), "Meeting Room 2B", fill=(20, 20, 20), font=font(66))
    d.text((165, 400), "Please knock before entering", fill=(20, 20, 20), font=font(40))
    d.text((165, 480), "Open 9:00 - 17:00", fill=(20, 20, 20), font=font(40))
    return img


def kitchen():
    img, d = canvas((235, 240, 235), (200, 200, 205))
    d.rectangle((0, 430, W, 460), fill=(120, 120, 125))                         # counter edge
    d.ellipse((150, 330, 330, 500), fill=(200, 30, 40))                         # apple
    d.line((240, 330, 250, 290), fill=(80, 50, 20), width=8)                    # stem
    d.rounded_rectangle((430, 180, 530, 500), 30, fill=(40, 120, 60))           # bottle
    d.rectangle((455, 150, 505, 200), fill=(60, 60, 60))                        # cap
    d.ellipse((600, 360, 880, 520), fill=(250, 250, 250), outline=(160, 160, 160), width=4)  # bowl
    d.ellipse((640, 375, 840, 430), fill=(225, 225, 230))
    return img


def door():
    img, d = canvas((215, 210, 200), (160, 130, 95))
    d.rectangle((120, 60, 400, 600), fill=(140, 85, 45), outline=(70, 40, 20), width=8)   # door
    d.rectangle((150, 100, 370, 330), outline=(90, 55, 25), width=6)                      # panel
    d.ellipse((345, 330, 380, 365), fill=(230, 200, 80))                                  # knob
    d.rectangle((580, 250, 800, 290), fill=(80, 60, 50))                                  # chair back top
    d.rectangle((580, 290, 600, 460), fill=(80, 60, 50))                                  # back posts
    d.rectangle((780, 290, 800, 460), fill=(80, 60, 50))
    d.rectangle((560, 440, 820, 480), fill=(100, 75, 60))                                 # seat
    for x in (570, 800):
        d.rectangle((x, 480, x + 18, 640), fill=(80, 60, 50))                             # legs
    return img


def table():
    img, d = canvas((240, 238, 232), (110, 90, 70))
    d.rectangle((140, 460, 420, 640), fill=(30, 70, 140), outline=(20, 40, 90), width=4)  # book
    d.rectangle((140, 460, 165, 640), fill=(20, 40, 90))                                  # spine
    d.text((190, 520), "ATLAS", fill=(240, 240, 240), font=font(48))
    d.rounded_rectangle((520, 470, 640, 680), 20, fill=(25, 25, 30))                      # phone
    d.rounded_rectangle((530, 490, 630, 660), 12, fill=(60, 90, 140))
    d.line((700, 660, 900, 470), fill=(30, 30, 30), width=14)                             # pen
    d.line((700, 660, 725, 636), fill=(220, 190, 60), width=14)                           # pen tip
    return img


SCENES = {"desk": desk, "sign": sign, "kitchen": kitchen, "door": door, "table": table}

if __name__ == "__main__":
    frames = config.EVALS_DIR / "frames"
    config.SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    frames.mkdir(parents=True, exist_ok=True)
    for name, fn in SCENES.items():
        img = fn()
        img.save(frames / f"{name}.jpg", quality=90)
        if name in ("desk", "sign", "kitchen"):
            img.save(config.SAMPLES_DIR / f"{name}.jpg", quality=90)
        print("wrote", name)
