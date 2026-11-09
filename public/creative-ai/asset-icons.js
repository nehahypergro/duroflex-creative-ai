/* Asset picker icons: one static, decorative SVG per asset card.
   Each icon = a format pictogram (what the asset physically is) + an optional "Ad"
   tag for paid cards + small channel badges (Instagram, Facebook, WhatsApp, ...).
   Channel marks are simplified recognisable labels drawn inline in each platform's
   well-known colour; they are never combined into new logos. No user data, external
   files, fonts, ids or scripts are used. Also loaded directly by Node tests. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.AssetIcons = value;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const r2 = v => Math.round(v * 100) / 100;
  const ink = 'currentColor';
  // Drawing helpers on a 48 × 48 canvas. Paper is white with an ink outline; tint and
  // solid fills use the tile's ink colour so every division keeps its own tone.
  const P = (x, y, w, h, r = 2.5) => `<rect class="ai-p" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" stroke="${ink}" stroke-width="2"/>`;
  const T = (x, y, w, h, r = 1.2, o = 0.18) => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${r}" fill="${ink}" fill-opacity="${o}"/>`;
  const F = (x, y, w, h, r = 1.2) => T(x, y, w, h, r, 0.72);
  const L = (x, y, len, w = 2, o = 1) => `<path d="M${r2(x)} ${r2(y)}h${r2(len)}" stroke="${ink}" stroke-width="${w}"${o < 1 ? ` stroke-opacity="${o}"` : ''}/>`;
  const C = (cx, cy, r, o = 0.72) => `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${ink}" fill-opacity="${o}"/>`;
  const O = (cx, cy, r, w = 2, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${ink}" stroke-width="${w}"${extra}/>`;
  const S = (d, w = 2, extra = '') => `<path d="${d}" stroke="${ink}" stroke-width="${w}"${extra}/>`;
  const Fp = (d, o = 0.72) => `<path d="${d}" fill="${ink}" fill-opacity="${o}"/>`;
  const Pp = d => `<path class="ai-p" d="${d}" fill="#fff" stroke="${ink}" stroke-width="2"/>`;
  const photo = (x, y, w, h, r = 1.2) => T(x, y, w, h, r) + Fp(`M${r2(x)} ${r2(y + h)}L${r2(x + w * 0.38)} ${r2(y + h * 0.42)}L${r2(x + w * 0.6)} ${r2(y + h * 0.72)}L${r2(x + w * 0.76)} ${r2(y + h * 0.56)}L${r2(x + w)} ${r2(y + h)}Z`, 0.5) + C(x + w * 0.74, y + h * 0.27, Math.min(w, h) * 0.11, 0.5);
  const sofa = (cx, cy, s = 1, o = 0.75) => `<g transform="translate(${cx} ${cy}) scale(${s})"><rect x="-6.5" y="-6" width="13" height="6" rx="2" fill="${ink}" fill-opacity="${r2(o * 0.6)}"/><path d="M-8-1a1.5 1.5 0 0 1 3 0v1.5h10V-1a1.5 1.5 0 0 1 3 0v5.5H-8Z" fill="${ink}" fill-opacity="${o}"/><path d="M-6.5 4.5v1.6M6.5 4.5v1.6" stroke="${ink}" stroke-width="${r2(1.6 / s)}"/></g>`;
  const person = (cx, cy, s = 1, o = 0.72) => `<g transform="translate(${cx} ${cy}) scale(${s})" fill="${ink}" fill-opacity="${o}"><circle cy="-4" r="3.4"/><path d="M-6.5 6a6.5 5.5 0 0 1 13 0Z"/></g>`;
  const phone = (x, y, w, h) => P(x, y, w, h, 3.5) + L(x + w / 2 - 2.5, y + 2.7, 5, 1.4, 0.6);
  const browser = (x, y, w, h) => P(x, y, w, h, 2.5) + S(`M${x} ${y + 6}h${w}`, 1.6) + C(x + 3, y + 3, 0.9, 1) + C(x + 5.8, y + 3, 0.9, 1) + C(x + 8.6, y + 3, 0.9, 1);
  const bars = (x, y, w) => { const seg = (w - 2) / 3; return [0, 1, 2].map(i => L(x + i * (seg + 1), y, seg, 1.4, i ? 0.35 : 1)).join(''); };
  const avatarRow = (x, y, len, two = false) => C(x + 2, y, 2) + L(x + 6, y - (two ? 1 : 0), len, 1.6) + (two ? L(x + 6, y + 2, len * 0.6, 1.2, 0.5) : '');
  const tick = (x, y, s = 1) => S(`M${x} ${y}l${r2(1.6 * s)} ${r2(1.6 * s)} ${r2(3.2 * s)}-${r2(3.6 * s)}`, 1.6);
  const cross = (x, y) => S(`M${x} ${y - 1.8}l3.4 3.6M${x + 3.4} ${y - 1.8}l-3.4 3.6`, 1.6);
  const crops = (x, y, w, h) => S(`M${x - 4} ${y}h3M${x} ${y - 4}v3M${x + w + 1} ${y}h3M${x + w} ${y - 4}v3M${x - 4} ${y + h}h3M${x} ${y + h + 1}v3M${x + w + 1} ${y + h}h3M${x + w} ${y + h + 1}v3`, 1.4);
  const spark = (cx, cy, s = 1, o = 0.72) => Fp(`M${cx} ${r2(cy - 5 * s)}Q${r2(cx + 1 * s)} ${r2(cy - 1 * s)} ${r2(cx + 5 * s)} ${cy}Q${r2(cx + 1 * s)} ${r2(cy + 1 * s)} ${cx} ${r2(cy + 5 * s)}Q${r2(cx - 1 * s)} ${r2(cy + 1 * s)} ${r2(cx - 5 * s)} ${cy}Q${r2(cx - 1 * s)} ${r2(cy - 1 * s)} ${cx} ${r2(cy - 5 * s)}Z`, o);
  const ring = (cx, cy, r) => O(cx, cy, r, 1.4, ' stroke-dasharray="2.2 1.4"');
  const megaphone = (x, y) => Fp(`M${x} ${y + 3}h4l9-5.5v17l-9-5.5h-4a1.5 1.5 0 0 1-1.5-1.5v-3a1.5 1.5 0 0 1 1.5-1.5Z`) + S(`M${x + 2} ${y + 9}l1.6 5.5`, 2) + S(`M${x + 17} ${y + 1}l2.6-1.6M${x + 17.5} ${y + 6}h3M${x + 17} ${y + 11}l2.6 1.6`, 1.6);
  const envelope = () => Pp('M5 21 24 33 43 21V41H5Z') + S('M5 41 19 30M43 41 29 30', 1.6);
  const pin = (cx, cy) => Pp(`M${cx} ${cy + 9}C${cx - 5} ${cy + 3} ${cx - 6.5} ${cy} ${cx - 6.5} ${cy - 2.5}A6.5 6.5 0 0 1 ${cx + 6.5} ${cy - 2.5}C${cx + 6.5} ${cy} ${cx + 5} ${cy + 3} ${cx} ${cy + 9}Z`) + C(cx, cy - 2.5, 2.3);
  const percent = (x, y, s = 1) => O(x, y, r2(1.7 * s), 1.6) + O(r2(x + 6 * s), r2(y + 6 * s), r2(1.7 * s), 1.6) + S(`M${r2(x + 6 * s)} ${r2(y - 1 * s)}L${x} ${r2(y + 7 * s)}`, 1.6);
  const link = (cx, cy) => `<g transform="translate(${cx - 6} ${cy - 6}) scale(.5)">${S('M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7', 3.4)}</g>`;

  // Format pictograms, one per card id. Comments name the physical format drawn.
  const art = {
    // Social
    'instagram-post': () => P(7, 7, 32, 32, 3) + photo(10, 10, 26, 26), // square post
    'instagram-portrait-post': () => P(10, 4, 27, 34, 3) + photo(13, 7, 21, 28), // 4:5 portrait post
    'instagram-story': () => phone(14, 3, 20, 39) + bars(17, 7.5, 14) + photo(16.5, 11, 15, 26.5), // 9:16 story
    'instagram-carousel': () => P(19, 4, 20, 26, 2.5) + P(14.5, 7, 20, 26, 2.5) + P(10, 10, 20, 26, 2.5) + photo(12.5, 12.5, 15, 21) + C(15, 42, 1.3, 1) + C(19.5, 42, 1.3, 0.35) + C(24, 42, 1.3, 0.35), // stacked slides + dots
    'facebook-post': () => P(7, 7, 32, 32, 3) + avatarRow(10, 12, 12) + photo(10, 17, 26, 19), // feed post with header
    'facebook-story': () => phone(14, 3, 20, 39) + bars(17, 7.5, 14) + C(18.5, 12, 1.7) + L(21.5, 12, 6, 1.4) + photo(16.5, 15.5, 15, 22), // story with poster row
    'facebook-carousel': () => P(4, 6, 40, 32, 3) + avatarRow(7, 11, 12) + photo(7, 16, 16, 18) + photo(25, 16, 16, 18), // card row in a post
    'landscape-post': () => P(4, 12, 40, 22, 2.5) + photo(6.5, 14.5, 35, 17), // 1.91:1 landscape
    'linkedin-post': () => P(4, 8, 40, 30, 2.5) + avatarRow(7, 13.5, 13, true) + photo(7, 19, 34, 16), // landscape feed post
    'linkedin-carousel': () => P(19, 4, 22, 30, 1.5) + Pp('M9 9h15l7 7v23H9Z') + S('M24 9v7h7', 1.6) + T(12, 18, 10, 7) + L(12, 29, 15, 1.6) + L(12, 33, 10, 1.6, 0.5), // PDF document pages
    'youtube-community-post': () => P(7, 6, 32, 32, 3) + avatarRow(10, 11, 12) + T(11, 16, 24, 4.5, 2.25) + F(11, 16, 17, 4.5, 2.25) + T(11, 23, 24, 4.5, 2.25) + F(11, 23, 9, 4.5, 2.25) + T(11, 30, 24, 4.5, 2.25) + F(11, 30, 5, 4.5, 2.25), // poll post
    'meme-trend-post': () => P(10, 4, 27, 35, 3) + L(14, 9.5, 19, 3) + photo(13, 13.5, 21, 16) + L(14, 34, 19, 3), // top/bottom caption meme
    'creator-ugc-post': () => P(10, 4, 27, 35, 3) + T(12.5, 6.5, 22, 30) + person(23.5, 23, 1.15) + `<circle cx="31" cy="10.5" r="2" fill="#E5484D"/>` + L(14, 9.5, 6, 1.4, 0.6), // creator selfie, recording dot
    // Ads (an "Ad" tag is added automatically for paid cards)
    'instagram-feed-ad': () => P(10, 6, 27, 34, 3) + photo(13, 9, 21, 21) + F(13, 33, 21, 4, 2), // portrait + CTA bar
    'instagram-story-ad': () => phone(14, 4, 20, 39) + bars(17, 8.5, 14) + photo(16.5, 12, 15, 18) + S('M21.5 33.5l2.5-2 2.5 2', 1.4) + F(18, 35.5, 12, 4, 2), // story + swipe-up CTA
    'facebook-feed-ad': () => P(7, 7, 32, 32, 3) + avatarRow(10, 12, 12) + photo(10, 16.5, 26, 14) + F(10, 33, 26, 3.5, 1.75), // feed post + CTA bar
    'facebook-story-ad': () => phone(14, 4, 20, 39) + bars(17, 8.5, 14) + C(18.5, 13, 1.7) + L(21.5, 13, 6, 1.4) + photo(16.5, 16.5, 15, 15) + F(18, 35, 12, 4, 2), // story + CTA
    'google-pmax-set': () => P(3, 13, 25, 14, 2) + photo(5.5, 15.5, 20, 9) + P(9, 25, 13, 17, 2) + T(11.5, 27.5, 8, 12) + P(24, 7, 17, 17, 2) + photo(26.5, 9.5, 12, 12), // landscape + square + portrait set
    'google-display-banners': () => P(5, 14, 38, 7, 1.5) + F(7.5, 16, 8, 3, 1) + L(18, 17.5, 14, 1.4) + P(5, 24, 8, 20, 1.5) + T(7, 26.5, 4, 15) + P(16, 25, 22, 17, 1.5) + photo(18.5, 27.5, 17, 12), // leaderboard, skyscraper, rectangle
    // Website
    'website-banner': () => browser(3, 7, 42, 32) + photo(6, 16, 36, 10) + L(6, 31, 20, 1.6) + L(6, 35, 12, 1.6, 0.5), // wide banner strip in a browser
    'homepage-hero': () => browser(3, 7, 42, 32) + photo(5.5, 15.5, 37, 21) + `<path d="M8.5 21.5h13M8.5 25.5h9" stroke="#fff" stroke-width="2.2"/>` + `<rect x="8.5" y="29" width="8" height="3.5" rx="1.75" fill="#fff"/>`, // full-width hero with headline
    'mobile-banner': () => phone(14, 3, 20, 40) + T(17, 7.5, 14, 3, 1.5) + photo(17, 13, 14, 17.5) + L(17, 34.5, 10, 1.6) + L(17, 38, 6, 1.4, 0.5), // banner on a mobile site
    'category-tile': () => P(9, 5, 30, 36, 3) + photo(12, 8, 24, 22) + L(16, 35, 16, 2.4), // single tile + label
    'collection-card': () => P(6, 6, 36, 34, 3) + photo(9, 9, 17, 20) + T(28, 9, 11, 9.5) + T(28, 19.5, 11, 9.5) + L(9, 34, 18, 2.2) + S('M33 32l3 2-3 2', 1.6), // collection collage card
    'multi-category-module': () => browser(3, 7, 42, 32) + photo(6, 16, 10.5, 13) + photo(18.75, 16, 10.5, 13) + photo(31.5, 16, 10.5, 13) + L(7.5, 33, 7, 1.4) + L(20.25, 33, 7, 1.4) + L(33, 33, 7, 1.4), // three category tiles in a row
    'landing-page-hero': () => browser(2, 5, 34, 27) + photo(4.5, 13.5, 29, 15.5) + phone(30, 18, 15, 26) + photo(32.5, 23, 10, 13), // desktop + mobile hero
    'landing-page-modules': () => P(11, 3, 26, 42, 2.5) + photo(14, 6, 20, 9) + T(14.5, 18.5, 5, 5, 2.5) + T(21.5, 18.5, 5, 5, 2.5) + T(28.5, 18.5, 5, 5, 2.5) + L(14, 28, 20, 1.6) + L(14, 31.5, 14, 1.4, 0.5) + F(18, 36.5, 12, 4, 2), // stacked page modules
    // Marketplace
    'product-page-images': () => P(4, 6, 40, 34, 2.5) + T(7, 9, 6, 6) + T(7, 17, 6, 6) + T(7, 25, 6, 6) + `<rect x="7" y="9" width="6" height="6" rx="1.2" stroke="${ink}" stroke-width="1.2"/>` + T(16, 9, 25, 21) + sofa(28.5, 20.5, 0.95) + L(16, 34.5, 11, 1.8) + F(31, 32.5, 10, 4, 2), // PDP gallery
    'marketplace-product-images': () => P(7, 4, 34, 34, 3) + `<ellipse cx="24" cy="29" rx="11" ry="1.6" fill="${ink}" fill-opacity=".14"/>` + sofa(24, 21, 1.25) + C(18, 43, 1.3, 1) + C(22, 43, 1.3, 0.35) + C(26, 43, 1.3, 0.35) + C(30, 43, 1.3, 0.35), // product on white + gallery dots
    'listing-feature-cards': () => P(3, 9, 20, 30, 2.5) + T(8.5, 13, 9, 9, 4.5) + tick(10.3, 17.6, 1) + L(7, 27, 12, 1.8) + L(7, 31, 8, 1.4, 0.5) + P(25, 9, 20, 30, 2.5) + T(30.5, 13, 9, 9, 4.5) + spark(35, 17.5, 0.62) + L(29, 27, 12, 1.8) + L(29, 31, 8, 1.4, 0.5), // feature cards
    'amazon-aplus': () => P(6, 3, 34, 41, 2.5) + photo(9, 6, 28, 10) + T(9, 19, 13, 9) + L(25, 21, 12, 1.6) + L(25, 25, 8, 1.4, 0.5) + T(9, 31, 8, 9) + T(19, 31, 8, 9) + T(29, 31, 8, 9), // stacked A+ modules
    // Messaging
    'whatsapp-image': () => Pp('M13 6H37a4 4 0 0 1 4 4V30a4 4 0 0 1-4 4H17l-8 6V10a4 4 0 0 1 4-4Z') + photo(12.5, 9.5, 25, 21), // image in a chat bubble
    'whatsapp-status': () => phone(14, 3, 20, 40) + L(17, 7.5, 6.5, 1.4) + L(24.5, 7.5, 6.5, 1.4, 0.35) + ring(19.5, 13, 2.6) + L(23.5, 13, 6, 1.4) + photo(16.5, 18, 15, 21), // status with ring
    'email-banner': () => P(10, 3, 28, 26, 1.5) + photo(13, 6, 22, 9) + L(13, 18.5, 16, 1.6) + envelope(), // email with hero banner
    'email-product-block': () => P(10, 3, 28, 26, 1.5) + T(13, 6, 10, 11) + sofa(18, 12, 0.55) + L(25.5, 8, 9, 1.6) + L(25.5, 11.5, 6, 1.4, 0.5) + F(25.5, 14, 8, 3, 1.5) + envelope(), // email with product module
    'rcs-card': () => phone(13, 3, 22, 41) + T(16, 8.5, 12, 3.5, 1.75) + P(16, 14.5, 16, 24, 2) + photo(16, 14.5, 16, 10) + L(18.5, 28, 10, 1.6) + L(18.5, 31.5, 7, 1.4, 0.5) + T(18, 34.5, 12, 2.5, 1.25), // rich card in a chat
    'rcs-carousel': () => phone(11, 3, 22, 41) + P(14, 11, 13, 21, 2) + photo(14, 11, 13, 9) + L(16, 24, 8, 1.4) + L(16, 27.5, 5, 1.2, 0.5) + P(29, 11, 13, 21, 2) + photo(29, 11, 13, 9) + L(31, 24, 8, 1.4) + C(18, 37, 1.2, 1) + C(22, 37, 1.2, 0.35) + C(26, 37, 1.2, 0.35), // swipeable rich cards
    'web-push': () => browser(3, 6, 42, 30) + L(6, 22, 14, 1.4, 0.4) + L(6, 26, 10, 1.4, 0.4) + P(21, 10, 22, 12, 2) + photo(23.5, 12.5, 7, 7) + L(33, 14, 7, 1.6) + L(33, 18, 4.5, 1.4, 0.5), // toast notification in a browser
    'web-push-icon': () => P(9, 9, 27, 27, 7) + spark(22.5, 22.5, 1.6) + `<circle cx="35" cy="10" r="4.5" fill="#fff"/><circle cx="35" cy="10" r="3.2" fill="#E5484D"/>`, // app icon + notification dot
    // Retail & print
    'google-business-post': () => P(4, 12, 28, 28, 2.5) + photo(7, 15, 22, 13) + L(7, 32, 14, 1.6) + L(7, 35.5, 9, 1.4, 0.5) + pin(34, 13), // business post with map pin
    'in-store-screen': () => P(4, 5, 40, 25, 2) + photo(6.5, 7.5, 35, 20) + S('M24 30v8M15 41h18M19 38h10', 2), // digital screen on a stand
    'store-banner': () => P(5, 3, 38, 10, 1.5) + L(10, 8, 18, 2.4) + F(31, 6, 8, 4, 2) + Pp('M5 15h38v3.5a3.17 3.17 0 0 1-6.33 0 3.17 3.17 0 0 1-6.34 0 3.17 3.17 0 0 1-6.33 0 3.17 3.17 0 0 1-6.33 0 3.17 3.17 0 0 1-6.34 0A3.17 3.17 0 0 1 5 18.5Z') + S('M8 22v20h32V22', 2) + P(20, 29, 8, 13, 1) + T(11, 26, 6, 6) + T(31, 26, 6, 6), // fascia banner above a shopfront
    'window-artwork': () => P(4, 5, 40, 36, 1.5) + T(5, 6, 38, 34, 0) + S('M17.3 5v36M30.7 5v36', 2) + sofa(24, 27, 1.5, 0.8) + `<path d="M7.5 15l5-5M7.5 20l9-9M20 12l3-3M33.5 13l4-4" stroke="#fff" stroke-width="1.6"/>`, // decal across glass panels
    'standee': () => P(15, 3, 18, 35, 1.5) + photo(17.5, 6, 13, 14) + L(18, 24, 12, 2) + L(18, 28, 8, 1.4, 0.5) + F(20, 31.5, 8, 3, 1.5) + F(11, 38, 26, 4, 2) + S('M14 42v2.5M34 42v2.5', 2), // roll-up standee
    'shelf-wobbler': () => P(8, 6, 9, 13, 1.2) + P(19, 9, 9, 10, 1.2) + P(30, 4, 10, 15, 1.2) + P(3, 19, 42, 4.5, 1) + S('M22 23.5v4', 2) + Pp('M22 27.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 1 1 0-15Z') + percent(19.5, 32.5, 0.75) + S('M33 31.5c1.5 1.5 1.5 4.5 0 6M36.5 30c2.5 2.5 2.5 7 0 9.5', 1.4, ' stroke-opacity=".55"'), // disc wobbler on a shelf edge
    'counter-product-card': () => Pp('M10 39 15 8H33L38 39Z') + photo(17, 12, 14, 11) + L(16.5, 28, 15, 2) + L(18, 32, 12, 1.4, 0.5) + S('M4 40h40', 2), // tent card on a counter
    'wall-graphic': () => P(3, 5, 42, 36, 1) + photo(4, 6, 40, 34, 0) + S('M17 5v36M31 5v36', 1.4, ' stroke-dasharray="2 2"') + P(34, 23, 8, 18, 0.5) + C(36, 32.5, 0.9, 1), // wall mural with seams and door
    'price-offer-board': () => P(6, 4, 36, 30, 2) + percent(11.5, 12, 1.25) + S('M26 13.5h11', 2, ' stroke-opacity=".5"') + S('M25.5 16l12-5', 1.4) + L(26, 21, 11, 3.2) + L(11, 28.5, 26, 1.4, 0.5) + S('M12 34 9.5 44M36 34l2.5 10', 2), // offer board on legs
    'poster-flyer': () => P(6, 4, 24, 33, 1.5) + photo(9, 7.5, 18, 14) + L(9, 26, 14, 2.6) + L(9, 31, 10, 1.4, 0.5) + C(18, 4, 1.8, 1) + `<g transform="rotate(10 34 29)">${P(26, 17, 16, 23, 1.2)}${T(28.5, 19.5, 11, 7)}${L(28.5, 30, 10, 1.8)}${L(28.5, 34, 7, 1.4, 0.5)}</g>`, // poster + flyer
    'brochure': () => Pp('M4 9 17 5V40L4 44Z') + Pp('M17 5 31 9V44L17 40Z') + Fp('M17 5 31 9V44L17 40Z', 0.12) + Pp('M31 9 44 5V40L31 44Z') + photo(6.5, 13, 8.5, 9) + L(7, 27, 7, 1.4) + L(7, 31, 5, 1.2, 0.5) + L(20, 15, 8, 1.4) + L(20, 19, 6, 1.2, 0.5) + L(34, 16, 7, 1.6) + L(34, 20, 5, 1.2, 0.5) + L(34, 24, 6, 1.2, 0.5), // tri-fold brochure
    // Corporate & employee
    'linkedin-square-post': () => P(7, 7, 32, 32, 3) + avatarRow(10, 12.5, 12, true) + photo(10, 18, 26, 18), // square feed post
    'linkedin-portrait-post': () => P(10, 4, 27, 36, 3) + avatarRow(13, 9.5, 11, true) + photo(13, 15, 21, 22), // portrait feed post
    'product-announcement': () => P(6, 6, 34, 34, 3) + megaphone(11, 16) + spark(33.5, 12.5, 0.55), // announcement post
    'leadership-post': () => P(10, 4, 27, 36, 3) + T(13, 7, 21, 18) + person(23.5, 17, 1.05) + L(15, 30, 17, 2.4) + L(17.5, 34.5, 12, 1.4, 0.5), // leader portrait + name/title
    'hiring-post': () => P(7, 6, 32, 32, 3) + C(23, 18, 6.5, 0.18) + person(23, 19, 0.75) + S('M29.4 21.3a7 7 0 1 1-1.6-8.2', 2.6) + L(13.5, 31, 19, 2.6) + F(30.5, 9, 6, 6, 3) + '<path d="M33.5 10.3v3.4M31.8 12h3.4" stroke="#fff" stroke-width="1.3"/>', // #hiring ring avatar
    'employer-branding-post': () => P(6, 6, 34, 34, 3) + person(14.5, 20, 0.7, 0.5) + person(31.5, 20, 0.7, 0.5) + person(23, 18, 0.85) + Fp('M23 34.3c-3-2-4.5-3.5-4.5-5a2.2 2.2 0 0 1 4.5-.5 2.2 2.2 0 0 1 4.5.5c0 1.5-1.5 3-4.5 5Z', 0.72), // team + heart
    'award-milestone-post': () => P(7, 6, 32, 32, 3) + Fp('M17 11h12v5a6 6 0 0 1-12 0Z') + S('M17 13h-2.5a3 3 0 0 0 3 4.5M29 13h2.5a3 3 0 0 1-3 4.5', 1.6) + S('M23 22v4', 2) + F(18.5, 26.5, 9, 3, 1) + L(15, 33, 16, 1.6, 0.5) + C(12, 12, 1, 0.5) + C(34, 22, 1, 0.5) + C(33, 11, 0.8, 0.5), // trophy post
    'packaging-still': () => Pp('M9 19H30V40H9Z') + Pp('M9 19 16 12H37L30 19Z') + `<path d="M30 19 37 12V33L30 40Z" fill="${ink}" fill-opacity=".2" stroke="${ink}" stroke-width="2"/>` + S('M19.5 19 26.5 12', 2.4, ' stroke-opacity=".45"') + L(12.5, 31, 9, 1.6) + L(12.5, 35, 6, 1.4, 0.5), // product carton
    'employee-share-card': () => P(4, 11, 27, 29, 2.5) + photo(7, 14, 21, 13) + L(7, 31, 14, 1.6) + L(7, 35, 9, 1.4, 0.5) + Fp('M30 4l10 7-10 7v-4c-5 0-8.5 1.5-11 5 .8-6 4.5-10 11-10.5Z'), // shareable card with share arrow
    'employee-status': () => phone(14, 3, 20, 40) + L(17, 7.5, 6.5, 1.4) + L(24.5, 7.5, 6.5, 1.4, 0.35) + ring(19.5, 13, 2.6) + L(23.5, 13, 6, 1.4) + T(16.5, 18, 15, 21) + person(24, 29.5, 0.9), // status with a person
    'internal-portal-banner': () => browser(3, 7, 42, 32) + T(6, 16, 36, 9) + person(12.5, 21.5, 0.42) + person(18, 21.5, 0.42) + L(23, 19.5, 14, 1.8) + L(23, 22.5, 9, 1.2, 0.5) + T(6, 28.5, 7, 7) + L(15, 30.5, 7, 1.4) + T(24, 28.5, 7, 7) + L(33, 30.5, 7, 1.4), // intranet news banner
    // Partners & PR
    'co-branded-post': () => P(5, 6, 38, 34, 3) + C(15.5, 20, 5.5) + F(27, 14.5, 11, 11, 2.5) + S('M20.5 18l3 3M23.5 18l-3 3', 1.6) + L(11, 32, 26, 1.8) + L(15, 35.5, 18, 1.2, 0.5), // two logos with a cross
    'partner-announcement': () => P(5, 6, 38, 34, 3) + O(19.5, 21, 6.5, 2.4) + O(28.5, 21, 6.5, 2.4, ' stroke-opacity=".55"') + S('M24 9.5v2.5M15 11l1.5 2M33 11l-1.5 2', 1.6) + L(13, 33.5, 22, 1.8), // linked rings announcement
    'partner-social-set': () => P(3, 13, 13, 13, 2) + Fp('M3 21 11 13h5L3 26Z', 0.35) + P(17.5, 13, 13, 13, 2) + Fp('M17.5 21l8-8h5l-13 13Z', 0.35) + P(32, 13, 13, 13, 2) + Fp('M32 21l8-8h5L32 26Z', 0.35) + S('M9.5 31v3h29v-3', 1.6) + S('M24 34v4', 1.6), // coordinated series
    'product-press-image': () => crops(9, 9, 30, 24) + T(9, 9, 30, 24, 0.5) + sofa(24, 22, 1.25) + `<g transform="translate(33 37)">${P(-5, -3, 10, 7.5, 1.5)}${O(0, 0.8, 1.9, 1.4)}</g>`, // high-res product shot with crop marks
    'leadership-press-image': () => crops(13, 7, 22, 30) + T(13, 7, 22, 30, 0.5) + person(24, 24.5, 1.45), // high-res portrait with crop marks
    'product-seeding-pack': () => `<g transform="rotate(-12 18 16)">${P(12, 6, 12, 16, 1.5)}${T(14, 8, 8, 7)}</g><g transform="rotate(10 30 15)">${P(24, 5, 12, 16, 1.5)}${T(26, 7, 8, 7)}</g>` + Pp('M7 24H41V42H7Z') + Fp('M7 24 3 18H19L23 24Z', 0.2) + Fp('M41 24 45 18H29L25 24Z', 0.2) + S('M7 24 3 18M41 24l4-6', 1.6) + F(19, 30, 10, 4, 1), // open kit box with cards
    'blog-hero': () => P(7, 3, 34, 42, 2) + photo(10, 6, 28, 14) + L(10, 25, 22, 2.6) + L(10, 30, 26, 1.4, 0.5) + L(10, 34, 24, 1.4, 0.5) + L(10, 38, 17, 1.4, 0.5), // article with lead image
    'article-illustration': () => P(7, 3, 34, 42, 2) + L(10, 8, 26, 1.4, 0.5) + L(10, 12, 20, 1.4, 0.5) + C(17, 24, 4.2, 0.55) + Fp('M21 31l5.5-10 5.5 10Z', 0.75) + T(28.5, 17, 6, 6, 1) + L(10, 36, 26, 1.4, 0.5) + L(10, 40, 17, 1.4, 0.5), // inline illustration in text
    'infographic': () => P(9, 2, 30, 44, 2) + L(13, 7, 16, 2.4) + F(13, 16, 3.5, 6, 0.6) + F(18, 13, 3.5, 9, 0.6) + F(23, 10, 3.5, 12, 0.6) + C(33, 16, 4, 0.18) + Fp('M33 16V12a4 4 0 0 1 3.8 5.2Z') + C(14.5, 28, 1.6) + L(18, 28, 15, 1.4) + C(14.5, 33.5, 1.6) + L(18, 33.5, 12, 1.4) + C(14.5, 39, 1.6) + L(18, 39, 14, 1.4), // chart + steps sheet
    'blog-link-preview': () => P(4, 9, 40, 30, 3) + photo(4, 9, 40, 14, 3) + `<path d="M5 22.5h38" stroke="${ink}" stroke-width="1.6"/>` + L(8, 27.5, 10, 1.2, 0.5) + L(8, 32, 22, 2.2) + link(37, 32), // link preview card
    // Sales & training
    'sales-one-pager': () => P(10, 3, 28, 40, 1.5) + F(10, 3, 28, 6, 1.5) + photo(13, 12.5, 10, 10) + L(25.5, 14, 9, 1.6) + L(25.5, 18, 7, 1.2, 0.5) + C(14, 28, 1.1) + L(17, 28, 17, 1.4) + C(14, 32.5, 1.1) + L(17, 32.5, 15, 1.4) + C(14, 37, 1.1) + L(17, 37, 12, 1.4), // A4 one-pager
    'product-cheat-sheet': () => P(10, 3, 28, 40, 1.5) + L(14, 9, 16, 2.4) + [16, 23, 30, 37].map((y, i) => `<rect x="14" y="${y - 2.5}" width="5" height="5" rx="1" stroke="${ink}" stroke-width="1.4"/>` + (i < 3 ? tick(14.9, y - 0.2, 0.7) : '') + L(22, y, i % 2 ? 9 : 12, 1.4)).join(''), // A4 checklist
    'mobile-reference-card': () => phone(14, 3, 20, 40) + T(17, 8, 14, 10) + sofa(24, 13.5, 0.6) + [22.5, 27.5, 32.5, 37.5].map(y => C(18.5, y, 1.3) + L(21.5, y, y > 30 ? 6 : 8, 1.4)).join(''), // spec card on a phone
    'battlecard': () => P(5, 5, 38, 36, 2.5) + T(5, 5, 19, 36, 2.5) + S('M24 5v36', 1.6) + L(9, 12, 11, 2.4) + L(28, 12, 11, 2.4) + [21, 28, 35].map(y => tick(9.5, y, 0.75) + L(15, y, 6, 1.2, 0.5) + cross(28.5, y) + L(34, y, 6, 1.2, 0.5)).join(''), // two-column comparison
    'training-deck': () => P(10, 4, 34, 19, 2) + P(7, 7, 34, 19, 2) + P(4, 10, 34, 19, 2) + photo(7, 13, 12, 13) + L(22, 16, 12, 2) + L(22, 20, 9, 1.4, 0.5) + L(22, 24, 11, 1.4, 0.5) + S('M21 29 15 43M21 29l6 14M21 29v11', 1.8), // 16:9 slides on a stand
    'catalogue': () => Pp('M24 12C18 9 10 8.5 4 10.5V39c6-2 14-1.5 20 1.5Z') + Pp('M24 12c6-3 14-3.5 20-1.5V39c-6-2-14-1.5-20 1.5Z') + photo(7.5, 15, 13, 10) + L(8, 30, 12, 1.4) + L(8, 33.5, 9, 1.2, 0.5) + T(27, 15, 6, 7) + T(35, 15, 6, 7) + T(27, 25, 6, 7) + T(35, 25, 6, 7) // open catalogue book
  };

  // Channel badges per card. Only cards on a recognisable platform get a badge.
  const badges = {
    'instagram-post': ['instagram'], 'instagram-portrait-post': ['instagram'], 'instagram-story': ['instagram'], 'instagram-carousel': ['instagram'],
    'facebook-post': ['facebook'], 'facebook-story': ['facebook'], 'facebook-carousel': ['facebook'], 'landscape-post': ['facebook', 'linkedin'],
    'linkedin-post': ['linkedin'], 'linkedin-carousel': ['linkedin'], 'youtube-community-post': ['youtube'], 'meme-trend-post': ['instagram', 'facebook'], 'creator-ugc-post': ['instagram', 'facebook'],
    'instagram-feed-ad': ['instagram'], 'instagram-story-ad': ['instagram'], 'facebook-feed-ad': ['facebook'], 'facebook-story-ad': ['facebook'], 'google-pmax-set': ['google'], 'google-display-banners': ['google'],
    'amazon-aplus': ['amazon'],
    'whatsapp-image': ['whatsapp'], 'whatsapp-status': ['whatsapp'], 'email-banner': ['email'], 'email-product-block': ['email'], 'rcs-card': ['rcs'], 'rcs-carousel': ['rcs'], 'web-push': ['web'], 'web-push-icon': ['web'],
    'google-business-post': ['google'],
    'linkedin-square-post': ['linkedin'], 'linkedin-portrait-post': ['linkedin'], 'product-announcement': ['linkedin'], 'leadership-post': ['linkedin'], 'hiring-post': ['linkedin'], 'employer-branding-post': ['linkedin'], 'award-milestone-post': ['linkedin'], 'packaging-still': ['linkedin'],
    'employee-share-card': ['whatsapp', 'linkedin'], 'employee-status': ['whatsapp']
  };
  const paid = new Set(['instagram-feed-ad', 'instagram-story-ad', 'facebook-feed-ad', 'facebook-story-ad', 'google-pmax-set', 'google-display-banners']);

  // Simplified channel marks, centred on 0,0 inside a white ring (radius ≈ 9.5).
  const disc = (colour, body) => `<circle r="9.5" fill="#fff"/><circle r="8" fill="${colour}"/>${body}`;
  const marks = {
    instagram: '<rect x="-9.5" y="-9.5" width="19" height="19" rx="6" fill="#fff"/><rect x="-8" y="-8" width="16" height="16" rx="4.6" fill="#E1306C"/><path d="M8 1A9 9 0 0 1-1-8H3.4A4.6 4.6 0 0 1 8-3.4Z" fill="#833AB4"/><path d="M-8-2A10 10 0 0 1 2 8H-3.4A4.6 4.6 0 0 1-8 3.4Z" fill="#F77737"/><path d="M-8 2.6A5.4 5.4 0 0 1-2.6 8H-3.4A4.6 4.6 0 0 1-8 3.4Z" fill="#FCAF45"/><rect x="-4.6" y="-4.6" width="9.2" height="9.2" rx="2.7" stroke="#fff" stroke-width="1.5"/><circle r="2.1" stroke="#fff" stroke-width="1.5"/><circle cx="2.6" cy="-2.6" r=".8" fill="#fff"/>',
    facebook: disc('#1877F2', '<path d="M1.3 8V1.7h2.2l.4-2.6H1.3v-1.6c0-.8.3-1.3 1.4-1.3h1.2v-2.3c-.3 0-1-.1-1.9-.1-2 0-3.3 1.2-3.3 3.4v1.9h-2.2v2.6h2.2V7.9Z" fill="#fff"/>'),
    whatsapp: disc('#25D366', '<path d="M-4.9 4.9l.8-2.6A4.7 4.7 0 1 1-1.9 4.3Z" stroke="#fff" stroke-width="1.4"/><path d="M-2.1-2.3c-.1 2 1.8 4.3 4.1 4.4l.9-1.1-1.3-.8-.6.5c-.8-.3-1.4-1-1.7-1.7l.5-.6-.8-1.3Z" fill="#fff"/>'),
    linkedin: '<rect x="-9.5" y="-9.5" width="19" height="19" rx="4.5" fill="#fff"/><rect x="-8" y="-8" width="16" height="16" rx="3" fill="#0A66C2"/><g fill="#fff"><rect x="-5.2" y="-1.6" width="2.3" height="6.4"/><circle cx="-4.05" cy="-4" r="1.35"/><path d="M-1.2-1.6H1v.9c.4-.7 1.2-1.1 2.2-1.1 1.6 0 2.2 1 2.2 2.7v3.9H3.1V1.3c0-.8-.2-1.4-.9-1.4-.8 0-1.2.6-1.2 1.4v3.5h-2.2Z"/></g>',
    youtube: '<rect x="-10" y="-7.6" width="20" height="15.2" rx="5" fill="#fff"/><rect x="-8.5" y="-6" width="17" height="12" rx="3.6" fill="#FF0000"/><path d="M-2.4-3.3 3.6 0-2.4 3.3Z" fill="#fff"/>',
    google: '<circle r="9.5" fill="#fff" stroke="#DADCE0" stroke-width="1"/><g stroke-width="2.6" stroke-linecap="butt"><path d="M3.54-3.54A5 5 0 0 0-4.53-2.11" stroke="#EA4335"/><path d="M-4.53-2.11A5 5 0 0 0-4.33 2.5" stroke="#FBBC05"/><path d="M-4.33 2.5A5 5 0 0 0 4.1 2.87" stroke="#34A853"/><path d="M4.1 2.87A5 5 0 0 0 5 0H.4" stroke="#4285F4"/></g>',
    amazon: disc('#232F3E', '<circle cx="-.7" cy="-2.1" r="2" stroke="#fff" stroke-width="1.4"/><path d="M1.3-4.4V.1" stroke="#fff" stroke-width="1.4"/><path d="M-5 2.4Q0 5.9 5 2.4" stroke="#FF9900" stroke-width="1.5"/><path d="M3 1.6 5.2 2.3 4.8 4.5" stroke="#FF9900" stroke-width="1.3"/>'),
    email: disc('#475569', '<rect x="-4.7" y="-3.4" width="9.4" height="6.8" rx="1" stroke="#fff" stroke-width="1.4"/><path d="M-4.2-2.6 0 .6 4.2-2.6" stroke="#fff" stroke-width="1.4"/>'),
    rcs: disc('#1A73E8', '<path d="M-4.6-3.6h9.2a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H-1.6l-3 2.4V3.4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z" fill="#fff"/><circle cx="-2.2" cy="-.1" r=".8" fill="#1A73E8"/><circle cy="-.1" r=".8" fill="#1A73E8"/><circle cx="2.2" cy="-.1" r=".8" fill="#1A73E8"/>'),
    web: disc('#0E7490', '<circle r="4.7" stroke="#fff" stroke-width="1.3"/><ellipse rx="2" ry="4.7" stroke="#fff" stroke-width="1.3"/><path d="M-4.7 0h9.4" stroke="#fff" stroke-width="1.3"/>')
  };
  const platformNames = { instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', linkedin: 'LinkedIn', youtube: 'YouTube', google: 'Google', amazon: 'Amazon', email: 'Email', rcs: 'RCS', web: 'Web' };
  const slots = [[39.5, 39.5], [24.5, 39.5]];
  const badgeMarkup = list => list.map((name, i) => [name, slots[i]]).reverse().map(([name, [x, y]]) => `<g class="ai-badge ai-badge-${name}" transform="translate(${x} ${y}) scale(.85)">${marks[name]}</g>`).join('');
  const adTag = '<g class="ai-ad"><rect x="1" y="1" width="17" height="10.5" rx="5.25" fill="#fff"/><rect x="2.2" y="2.2" width="14.6" height="8.1" rx="4.05" fill="#E8590C"/><path d="M5.4 8.4 7.2 4.1 9 8.4M6 7h2.4" stroke="#fff" stroke-width="1.25"/><circle cx="11.9" cy="7" r="1.45" stroke="#fff" stroke-width="1.25"/><path d="M13.35 4.1v4.3" stroke="#fff" stroke-width="1.25"/></g>';
  const fallbackArt = () => P(8, 8, 32, 32, 3) + photo(11, 11, 26, 26);
  const wrap = (key, body) => `<svg class="asset-icon" data-asset-icon="${key}" viewBox="0 0 48 48" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  const cache = new Map();
  function iconFor(cardId) {
    const id = String(cardId || '');
    if (!Object.prototype.hasOwnProperty.call(art, id)) return wrap('fallback', `<g class="ai-art">${fallbackArt()}</g>`);
    if (!cache.has(id)) cache.set(id, wrap(id, `<g class="ai-art">${art[id]()}</g>${paid.has(id) ? adTag : ''}${badgeMarkup(badges[id] || [])}`));
    return cache.get(id);
  }
  const badgesFor = cardId => (badges[cardId] || []).slice();
  return Object.freeze({ iconFor, badgesFor, isPaidIcon: id => paid.has(id), ids: Object.freeze(Object.keys(art)), platforms: Object.freeze(Object.keys(marks)), platformNames: Object.freeze(platformNames) });
});
