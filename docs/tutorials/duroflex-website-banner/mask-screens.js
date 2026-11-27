// Copies raw Studio screenshots to screens/ and blurs the signed-in account name
// in the sidebar's bottom-left corner, so no personal account details are kept.
// The raw captures show the account name, so keep them OUTSIDE the repository and pass
// their folder: node docs/tutorials/duroflex-website-banner/mask-screens.js <raw folder>
// Screens are saved as compact palette PNGs; banner and close-up photos as JPEG.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = __dirname;
const raw = path.resolve(process.argv[2] || path.join(dir, 'raw'));
const out = path.join(dir, 'screens');
fs.mkdirSync(out, { recursive: true });

// Screens without the Studio sidebar (the full-screen editor) need no mask.
const noSidebar = new Set(fs.readdirSync(raw).filter((f) => /^(27|3\d)-/.test(f)));
// Account name and role sit here in every 800-px-wide capture. Under a pop-up only the
// strip below the pop-up's bottom edge shows, so the blur starts lower there.
const fullBox = { left: 50, top: 654, width: 104, height: 46 };
const belowPopup = { '05-product-picker.png': 669, '18-review-1.png': 667, '19-review-2.png': 667, '20-review-estimate.png': 667 };

(async () => {
  for (const name of fs.readdirSync(raw).filter((f) => f.endsWith('.png')).sort()) {
    const src = path.join(raw, name);
    const dst = path.join(out, name);
    const meta = await sharp(src).metadata();
    const top = belowPopup[name] || fullBox.top;
    const box = { ...fullBox, top, height: fullBox.top + fullBox.height - top };
    if (/^(banner-final|ba-)/.test(name)) {
      await sharp(src).jpeg({ quality: 88, mozjpeg: true }).toFile(dst.replace(/\.png$/, '.jpg'));
      continue;
    }
    const png = (img) => img.png({ palette: true, quality: 95, effort: 10, compressionLevel: 9 }).toFile(dst);
    if (noSidebar.has(name) || meta.width !== 800 || meta.height < box.top + box.height) {
      await png(sharp(src));
      continue;
    }
    const patch = await sharp(src).extract(box).blur(9).toBuffer();
    await png(sharp(await sharp(src).composite([{ input: patch, left: box.left, top: box.top }]).png().toBuffer()));
  }
  console.log('Masked screens written to', out);
})();
