"""Bounded local extraction. No network, speech recognition or model calls."""
import sys, json, pathlib, math
from PIL import Image, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS = 40_000_000
source, target, ext = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), sys.argv[3]
target.mkdir(parents=True, exist_ok=True)
result = {"version": 1, "format": ext, "previews": [], "metadata": {}, "text": "", "limitations": []}

if ext in ("ttf", "otf", "woff", "woff2"):
    from fontTools.ttLib import TTFont
    font = TTFont(source, lazy=False)
    names = {}
    for n in font["name"].names:
        if n.nameID in (1, 2, 4, 6, 13, 14) and str(n.nameID) not in names:
            names[str(n.nameID)] = n.toUnicode()[:4000]
    cmap = font.getBestCmap() or {}
    result["metadata"] = {"names": names, "glyphCount": len(font.getGlyphOrder()), "unicodeCodepoints": len(cmap), "embeddingBits": int(font["OS/2"].fsType) if "OS/2" in font else None, "variableAxes": [{"tag": a.axisTag, "min": a.minValue, "default": a.defaultValue, "max": a.maxValue} for a in font["fvar"].axes] if "fvar" in font else []}
    normalized = target / "specimen-font.ttf"
    font.flavor = None
    font.save(normalized)
    image = Image.new("RGB", (1200, 500), "#f8f5ef")
    draw = ImageDraw.Draw(image)
    for i, text in enumerate([names.get("1", "Font specimen"), "Aa Bb Cc — Comfort for everyday living", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz", "0123456789 ₹ ! ? &", "आराम की नई शुरुआत"]):
        supported = "".join(c if ord(c) in cmap or c.isspace() else "□" for c in text)
        draw.text((35, 25 + i * 72), supported, fill="#202020", font=ImageFont.truetype(str(normalized), 32))
    image.save(target / "preview-1.png")
    normalized.unlink()
    result["previews"] = [{"file": "preview-1.png", "label": "Locally rendered glyph specimen"}]
    result["text"] = json.dumps(result["metadata"], ensure_ascii=False)
    result["limitations"] = ["Parsed font metadata and actual glyph specimen only. Font is not installed or automatically applied to generated artwork.", "Embedding bits and supplied licence strings are evidence, not a licence clearance; confirm usage rights."]
elif ext == "psd":
    from psd_tools import PSDImage
    psd = PSDImage.open(source)
    if psd.width * psd.height > 40_000_000:
        raise ValueError("PSD exceeds 40 million pixels")
    image = psd.composite()
    image.thumbnail((1600, 1600))
    image.save(target / "preview-1.png")
    layers = []
    for layer in psd.descendants():
        if len(layers) >= 1000:
            break
        layers.append({"name": str(layer.name)[:300], "kind": layer.kind, "visible": layer.visible})
    result["metadata"] = {"width": psd.width, "height": psd.height, "layers": layers}
    result["previews"] = [{"file": "preview-1.png", "label": "Flattened PSD composite"}]
    result["text"] = json.dumps(layers, ensure_ascii=False)
    result["limitations"] = ["Flattened composite and up to 1000 layer names; layer editing, smart-object execution and font fidelity are not certified."]
elif ext == "ai" and source.read_bytes()[:5] == b"%PDF-":
    import fitz
    doc = fitz.open(source)
    texts = []
    for i in range(min(4, len(doc))):
        page = doc[i]
        if max(page.rect.width, page.rect.height) > 100000:
            raise ValueError("Oversized PDF artboard")
        pix = page.get_pixmap(matrix=fitz.Matrix(min(2, 1600 / max(page.rect.width, page.rect.height)), min(2, 1600 / max(page.rect.width, page.rect.height))), alpha=False)
        name = f"preview-{i+1}.png"
        pix.save(target / name)
        result["previews"].append({"file": name, "label": f"PDF-compatible Illustrator artboard {i+1}"})
        texts.append(page.get_text()[:12000])
    result["metadata"] = {"artboardCount": len(doc), "sampledArtboards": min(4, len(doc))}
    result["text"] = "\n".join(texts)
    result["limitations"] = ["Only PDF-compatible artboards, up to four. Illustrator editing/layer semantics are not interpreted."]
elif ext in ("mp4", "mov", "webm", "mp3", "wav", "m4a"):
    import av
    import numpy as np
    container = av.open(str(source))
    duration = float(container.duration / av.time_base) if container.duration else None
    streams = [{"type": s.type, "codec": s.codec_context.name, "duration": float(s.duration * s.time_base) if s.duration else None} for s in container.streams]
    result["metadata"] = {"durationSeconds": duration, "streams": streams}
    videos = list(container.streams.video)
    if videos:
        stream = videos[0]
        if stream.codec_context.width * stream.codec_context.height > 40_000_000:
            raise ValueError("Video frame exceeds 40 million pixels")
        span = min(duration or 10, 60)
        for i, second in enumerate([span * v for v in (0, .2, .4, .6, .8, .95)]):
            container.seek(int(second / float(stream.time_base)), stream=stream)
            for frame in container.decode(stream):
                t = float(frame.time or 0)
                if t + .1 < second:
                    continue
                image = frame.to_image()
                image.thumbnail((1600, 1600))
                name = f"preview-{i+1}.png"
                image.save(target / name)
                result["previews"].append({"file": name, "label": f"Sampled video frame at {t:.2f}s", "seconds": t})
                break
        result["limitations"].append("At most six sampled frames from the first 60 seconds; not a full-video inspection, motion or speech analysis.")
    container.close()
    container = av.open(str(source))
    audio = list(container.streams.audio)
    if audio:
        stream = audio[0]
        peaks = []
        elapsed = 0
        for frame in container.decode(stream):
            if elapsed >= 30 or len(peaks) >= 3000:
                break
            data = frame.to_ndarray().astype(float)
            peak = float(np.max(np.abs(data))) if data.size else 0
            peaks.append(peak)
            elapsed += frame.samples / frame.sample_rate
        image = Image.new("RGB", (1200, 300), "#f8f5ef")
        draw = ImageDraw.Draw(image)
        maximum = max(peaks or [1]) or 1
        for i, peak in enumerate(peaks):
            x = int(i * 1190 / max(1, len(peaks))) + 5
            y = int(peak / maximum * 110)
            draw.line((x, 150-y, x, 150+y), fill="#326466")
        image.save(target / "waveform.png")
        result["previews"].append({"file": "waveform.png", "label": "Peak waveform from sampled audio; not a style reference"})
        result["metadata"]["audioSampledSeconds"] = min(30, elapsed)
        result["metadata"]["waveform"] = "waveform.png"
        result["limitations"].append("Audio metadata and first-30-second peak waveform only; speech has not been transcribed. Add an explicit supplied transcript separately.")
    container.close()
    result["text"] = json.dumps(result["metadata"], ensure_ascii=False)
else:
    raise ValueError("Export this proprietary design as PDF/PNG/SVG and link the export to the original; this format has no local decoder")
result["text"] = result["text"][:50000]
(target / "extraction.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
