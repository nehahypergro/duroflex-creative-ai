"""Convert actual raster bytes using the exact uploaded printer ICC profile."""
import sys, json, pathlib, io
from PIL import Image, ImageCms
Image.MAX_IMAGE_PIXELS = 40_000_000
request = json.loads(pathlib.Path(sys.argv[1]).read_text())
profile_bytes = pathlib.Path(request["iccPath"]).read_bytes()
profile = ImageCms.ImageCmsProfile(io.BytesIO(profile_bytes))
if profile_bytes[12:16] != b"prtr" or profile_bytes[16:20] != b"CMYK":
    raise ValueError("Use a CMYK printer output ICC profile, not a display/RGB profile")
outputs = []
for i, item in enumerate(request["images"]):
    image = Image.open(item["source"])
    if image.mode in ("RGBA", "LA") or "transparency" in image.info:
        rgba = image.convert("RGBA")
        base = Image.new("RGBA", rgba.size, (255,255,255,255))
        image = Image.alpha_composite(base, rgba).convert("RGB")
    else:
        image = image.convert("RGB")
    embedded = Image.open(item["source"]).info.get("icc_profile")
    source = ImageCms.ImageCmsProfile(io.BytesIO(embedded)) if embedded else ImageCms.createProfile("sRGB")
    flags = ImageCms.Flags.BLACKPOINTCOMPENSATION if request["blackPointCompensation"] else 0
    converted = ImageCms.profileToProfile(image, source, profile, renderingIntent=request["renderingIntent"], outputMode="CMYK", flags=flags)
    target = pathlib.Path(request["target"]) / f"page-{i+1}.jpg"
    converted.save(target, quality=100, subsampling=0, icc_profile=profile_bytes)
    outputs.append({"file": target.name, "width": converted.width, "height": converted.height, "mode": converted.mode, "inputProfile": "embedded" if embedded else "assumed sRGB"})
pathlib.Path(request["target"], "conversion.json").write_text(json.dumps({"pages":outputs,"profileDescription":ImageCms.getProfileDescription(profile).strip(),"renderingIntent":request["renderingIntent"],"blackPointCompensation":request["blackPointCompensation"],"limitations":["Raster CMYK conversion with embedded printer ICC, not PDF/X certification or vector type reconstruction.","JPEG raster encoding; source pixels and PPI do not increase.","Physical stock/colour proof and operator acceptance remain separate."]},indent=2))
