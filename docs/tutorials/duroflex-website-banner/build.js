// Builds the Duroflex website banner tutorial.
//   1. node docs/tutorials/duroflex-website-banner/mask-screens.js   (raw/ → screens/, account name blurred)
//   2. node docs/tutorials/duroflex-website-banner/build.js           (tutorial.html + the PDF)
// Screenshots are 800 px wide captures of the local Studio (25 Nov 2026). Crops and the
// numbered markers below use pixel positions in those captures.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const pdfPath = path.join(dir, '..', 'duroflex-website-banner-tutorial.pdf');
const htmlPath = path.join(dir, 'tutorial.html');
const sharp = require('sharp');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sizes = {};

// A cropped screenshot with numbered markers (n) and highlight boxes (b), all in capture pixels.
function shot(file, { crop, marks = [], boxes = [], caption = '', width = '100%', cls = '' } = {}) {
  const full = sizes[file];
  const [x, y, w, h] = crop || [0, 0, full.w, full.h];
  const pctX = (v) => (((v - x) / w) * 100).toFixed(3) + '%';
  const pctY = (v) => (((v - y) / h) * 100).toFixed(3) + '%';
  const img = `<img src="screens/${file}" style="width:${((full.w / w) * 100).toFixed(3)}%;left:${(-(x / w) * 100).toFixed(3)}%;top:${(-(y / h) * 100).toFixed(3)}%" alt="">`;
  const bx = boxes.map(([bx0, by0, bw, bh]) => `<span class="hl" style="left:${pctX(bx0)};top:${pctY(by0)};width:${((bw / w) * 100).toFixed(3)}%;height:${((bh / h) * 100).toFixed(3)}%"></span>`).join('');
  const mk = marks.map(([n, mx, my]) => `<span class="mark" style="left:${pctX(mx)};top:${pctY(my)}">${n}</span>`).join('');
  return `<figure class="shot ${cls}" style="width:${width}"><div class="crop" style="aspect-ratio:${w}/${h}">${img}${bx}${mk}</div>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
}
const key = (items) => `<ol class="key">${items.map(([n, t, d]) => `<li><span class="kn">${n}</span><div><b>${t}</b>${d ? ' ' + d : ''}</div></li>`).join('')}</ol>`;
const note = (kind, title, body) => `<aside class="note ${kind}"><b>${title}</b><div>${body}</div></aside>`;
const table = (head, rows, cls = '') => `<table class="${cls}"><thead><tr>${head.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="f"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

const steps = [];
const stepIds = {};
const step = (id, part, title, body) => { steps.push({ title }); stepIds[id] = steps.length; return { kind: 'step', n: steps.length, id, part, title, body }; };
const ref = (html) => html.replace(/@@(\w+)@@/g, (m, id) => { if (!stepIds[id]) throw Error('Unknown step reference ' + id); return 'Step ' + stepIds[id]; });

function buildPages() {
  const pages = [];

  // ---------- Cover ----------
  pages.push({ kind: 'cover' });
  pages.push({ kind: 'contents' });
  pages.push({ kind: 'intro' });

  // ---------- Step 1 ----------
  pages.push(step('open', 1, 'Open the Studio and check the brand', `
    <p class="lead">Everything you make in the Studio belongs to one brand. Before you do anything else, make sure <b>Duroflex</b> is the brand that is switched on.</p>
    <ol class="do">
      <li>Open the Studio in your web browser. On the computer where the Studio runs, the address is <code>http://127.0.0.1:1842/creative-ai/studio</code>. Your team may give you a different link.</li>
      <li>If the Studio asks you to sign in, sign in with your own account. If you do not have one, ask an admin to create it.</li>
      <li>Look at the brand switch in the top right corner. The brand that is on has a white box and a short line under its name.</li>
    </ol>
    ${shot('01-home.png', {
      crop: [0, 0, 800, 600],
      boxes: [[503, 15, 135, 45], [235, 177, 516, 135], [228, 470, 150, 54], [10, 194, 168, 31]],
      marks: [[1, 497, 17], [2, 236, 178], [3, 368, 283], [4, 226, 473], [5, 12, 198]],
    })}
    ${key([
      [1, 'Brand switch.', 'Here Duroflex is on. If Sleepyhead is on, click <b>Duroflex</b>. The page reloads with Duroflex’s products and projects.'],
      [2, 'Home brief box.', 'Describe what you want in your own words, the way you would brief an agency. (Way C on the next pages.)'],
      [3, 'Choose formats yourself.', 'Opens the full list of formats. (Way B.)'],
      [4, 'Website Banner card.', 'The quickest way to start a website banner. (Way A.)'],
      [5, 'Projects.', 'Everything you and your team have made for this brand, newest first.'],
    ])}
    ${note('info', 'Why the brand matters', 'Duroflex and Sleepyhead are kept completely separate. Each has its own products, colours, rooms, models and rules, and the Studio never mixes them. If you start a brief with the wrong brand switched on, you will only see that brand’s products.')}
  `));

  // ---------- Step 2 ----------
  pages.push(step('format', 1, 'Pick the Website Banner format', `
    <p class="lead">A <b>format</b> is the kind of picture you want and its size. A website banner is a wide strip, <b>1920 × 640</b> pixels (three times wider than it is tall). It usually sits at the top of a web page. There are three ways to start one.</p>
    <div class="ways">
      <div><span class="way">A</span><b>From the home page.</b> Click the <b>Website Banner</b> card. The brief form opens straight away.</div>
      <div><span class="way">B</span><b>From the format list.</b> Click <b>Choose formats yourself</b>, then follow the picture below.</div>
      <div><span class="way">C</span><b>From the home brief box.</b> Type your brief and press <b>Create</b>. See the next page.</div>
    </div>
    ${shot('03-picker-selected.png', {
      crop: [190, 260, 610, 455],
      boxes: [[389, 276, 78, 35], [216, 327, 148, 121], [226, 652, 134, 56], [624, 658, 132, 47]],
      marks: [[1, 389, 278], [2, 218, 330], [3, 224, 655], [4, 622, 660]],
      width: '80%',
    })}
    ${key([
      [1, 'Website tab.', 'Shows only the formats made for your own website.'],
      [2, 'Website Banner card.', 'Click it. A tick appears in its corner.'],
      [3, 'Your selection.', 'Shows what you picked. Click × to remove it.'],
      [4, 'Continue.', 'Opens the brief form for the formats you picked.'],
    ])}
    ${note('tip', 'Other website formats', '<b>Homepage Hero</b> (about 1920 × 700), <b>Mobile Banner</b> (1080 × 1350), <b>Category Tile</b>, <b>Collection Card</b> (1600 × 900) and <b>Landing Page Hero</b> (a desktop and a mobile picture together). If you tick more than one format, they become one campaign with one shared brief. This guide uses only Website Banner.')}
  `));

  // ---------- Step 2c: home brief box ----------
  pages.push(step('wayc', 1, 'Way C: let the Studio read your brief', `
    <p class="lead">If you already have a brief in words, type it into the home brief box and press <b>Create</b>. The Studio reads it, works out the product, format, language and message, and opens the brief form already filled in. <b>Nothing is made yet.</b> You still check every value first.</p>
    ${shot('01b-home-brief.png', { crop: [228, 170, 530, 150], boxes: [[236, 186, 516, 56], [631, 263, 110, 40]], marks: [[1, 238, 188], [2, 629, 265]], width: '74%' })}
    ${shot('01d-reading-notes.png', { crop: [222, 60, 540, 140], boxes: [[231, 67, 523, 126]], marks: [[3, 233, 69]], width: '74%' })}
    ${key([
      [1, 'Your brief in plain words.', 'Name the product, where it will run and what it should say. Example: “Website banner for Duropedic Airboost on our homepage, in English. Talk about cooler sleep with 1 lakh+ Airknit fibres.”'],
      [2, 'Create.', 'Starts a short AI reading of your brief. It takes under a minute and costs about <b>₹0.24</b> (estimate).'],
      [3, 'What the Studio assumed.', 'Read this yellow box. It lists every guess the reading made. Change anything that is wrong in the form below it.'],
    ])}
    <h3>The three coloured dots</h3>
    <p>On the brief form, a small dot beside a field tells you where its value came from. The key is at the top of the form.</p>
    ${shot('04-brief-top.png', { crop: [340, 100, 420, 34], boxes: [] , width: '78%', cls: 'flat'})}
    ${table(['Dot', 'Label', 'What it means'], [
      ['<span class="dot g"></span>', 'From your brief or your choice', 'You typed it, picked it, or the reading found it word for word in your brief.'],
      ['<span class="dot b"></span>', 'We suggested', 'The Studio chose a sensible default (for example the Queen size). Check it.'],
      ['<span class="dot r"></span>', 'Needs you', 'Required and still empty. You cannot create until it is filled in.'],
    ], 'small')}
    ${note('warn', 'The reading never invents an offer', 'If your brief does not give an exact offer, dates or terms word for word, those fields stay empty so the form asks you. An unclear product or size also stays empty.')}
  `));

  // ---------- Step 3: form tour ----------
  pages.push(step('form', 2, 'Get to know the brief form', `
    <p class="lead">The <b>brief</b> is your instruction to the Studio: what to make, for which product, and what it should say. The form is one long page. The top part looks like this.</p>
    ${shot('04-brief-top.png', {
      crop: [205, 88, 575, 632],
      boxes: [[223, 185, 270, 38], [231, 314, 524, 82], [233, 410, 182, 27], [548, 410, 204, 27], [244, 553, 248, 64], [497, 553, 255, 64], [648, 664, 118, 40]],
      marks: [[1, 352, 104], [2, 224, 187], [3, 233, 316], [4, 233, 412], [5, 550, 412], [6, 246, 555], [7, 499, 555], [8, 646, 666]],
      width: '70%',
    })}
    ${key([
      [1, 'Colour key.', 'What the dots beside each field mean (see the previous page).'],
      [2, 'Brief → Check → Create.', 'The three stages. You are on stage 1.'],
      [3, 'Your brief.', 'Write the request in your own words. Mention the mood or setting you want here too.'],
      [4, 'Attach brief.', 'Add a PDF or Word file if the brief came as a document. <b>Recover uploads</b> brings back files from an earlier visit.'],
      [5, 'Add reference / From library.', 'Add a picture to guide the design (@@look@@).'],
      [6, 'Product / SKU.', 'Which Duroflex product the banner is about (@@product@@).'],
      [7, 'Format.', 'Website Banner. Click it to change or add formats.'],
      [8, 'Summary bar and Check brief.', 'Always at the bottom of the screen. It shows what is still missing and, once the brief is complete, the cost estimate (@@create@@).'],
    ])}
    ${note('info', 'Your work is saved as you go', 'The form saves itself as a <b>Draft</b> (you will see “Draft saved” at the top). You can close the page and come back from <b>Projects → Draft</b>.')}
  `));

  // ---------- Step 4: product ----------
  pages.push(step('product', 2, 'Choose the product and its size', `
    <p class="lead">Click <b>Choose a product</b>. The list shows the Duroflex products saved in the Studio, grouped by category, with the official website photos.</p>
    <div class="two wide-left">
      ${shot('05-product-picker.png', {
        crop: [30, 112, 495, 535],
        boxes: [[41, 127, 480, 39], [42, 185, 236, 39], [283, 562, 234, 79]],
        marks: [[1, 41, 129], [2, 42, 187], [3, 285, 564]],
      })}
      <div>${key([
        [1, 'Search.', 'Type part of the name, or paste the product’s page link from the Duroflex website.'],
        [2, 'Product, Collection or Brand only.', 'For a website banner about one product, keep <b>Product</b>. <b>Collection</b> puts several products together, and <b>Brand only</b> has no product. Only some formats allow these two.'],
        [3, 'Pick the exact product.', 'Here: Duropedic Airboost 6.8. “37 variants” means it comes in 37 sizes.'],
      ])}</div>
    </div>
    <h3>Check the size (the variant)</h3>
    ${shot('06-product-variant.png', {
      crop: [222, 150, 545, 318],
      boxes: [[298, 205, 230, 64], [298, 270, 236, 66], [231, 366, 524, 93], [658, 418, 90, 27]],
      marks: [[4, 292, 210], [5, 292, 276], [6, 233, 368], [7, 656, 420]],
      width: '56%',
    })}
    ${key([
      [4, 'Product name.', 'The full name from the website. Ad copy on the banner uses a short name instead (for example “Duropedic Airboost”).'],
      [5, 'Size and SKU.', 'A <b>variant</b> is one size of the product. Its <b>SKU</b> is the shop’s code for that exact size.'],
      [6, 'We suggested this size.', 'For mattresses the Studio picks Queen 72 × 60 by itself and marks it with a brown dot.'],
      [7, 'Change size.', 'Use it when the banner is about another size, for example an offer only on King size.'],
    ])}
    ${note('tip', 'Product missing from the list?', 'Only saved products appear. Anyone on the team can add one from its official Duroflex page link (Brand Library → Products).')}
  `));

  // ---------- Step 5: objective, language, message, features ----------
  pages.push(step('message', 2, 'Objective, language, message and features', `
    <p class="lead">These four choices decide what the banner is trying to do and what it is allowed to say.</p>
    ${shot('07-message-features.png', {
      crop: [212, 0, 555, 418],
      boxes: [[229, 9, 494, 37], [229, 89, 527, 41], [229, 185, 520, 79], [229, 273, 527, 143]],
      marks: [[1, 225, 11], [2, 225, 91], [3, 225, 187], [4, 225, 275]],
      width: '80%',
    })}
    ${table(['', 'Field', 'What to choose'], [
      ['1', '<b>Objective</b> (required)', '<b>Awareness</b>: introduce the product to new people. <b>Consideration</b>: help people compare and see why it is better. <b>Purchase</b>: ask people to buy now, usually with an offer. <b>Engagement</b>: get people to react or reply. <b>Education</b>: explain how something works.'],
      ['2', '<b>Language</b>', 'The language of the words on the banner: English, Hindi, Hinglish, Kannada, Tamil, Telugu, Malayalam, Gujarati, Marathi or Bengali.'],
      ['3', '<b>What should it say?</b> (choose one)', '<b>Benefit</b>: what the customer gains. <b>Product launch</b>: a new product. <b>Offer / price / EMI</b>: a sale or price; this opens the offer fields (@@offer@@). <b>Proof / claim</b>: a fact with its source, such as a certificate. <b>Technology</b>: how it is built; the Studio may show the product’s official technology picture. <b>Comparison</b>: how it compares, using only facts you have. <b>Store news</b>: a store opening or event.'],
      ['4', '<b>Features to highlight</b> (required)', 'Ticked from the product’s official web page. Keep the one to three that matter most for this banner. To add your own, type it in <b>Custom feature</b> with any conditions, then click <b>Add</b>.'],
    ], 'small')}
    ${note('warn', 'Features are the only product facts the banner may use', 'The Studio only writes product claims that come from the ticked features or the product’s official page. It never invents a claim. If a fact is not ticked or typed, it will not appear.')}
  `));

  // ---------- Step 6: format settings ----------
  pages.push(step('settings', 2, 'Format settings', `
    <p class="lead">This box sets the size and a few website-specific choices. For a normal homepage banner you can usually leave them as they are.</p>
    ${shot('08-format-settings.png', {
      crop: [232, 8, 520, 408],
      boxes: [[244, 15, 244, 83], [244, 106, 498, 81], [244, 208, 244, 96], [498, 208, 244, 96], [244, 314, 244, 95], [498, 314, 244, 95]],
      marks: [[1, 246, 17], [2, 246, 108], [3, 246, 210], [4, 500, 210], [5, 246, 316], [6, 500, 316]],
      width: '78%',
    })}
    ${table(['', 'Field', 'What it means'], [
      ['1', '<b>Format</b>', '<b>Website banner · 1920 × 640</b>. You can switch to another size, or pick <b>Custom size</b> and type the width and height your web team gave you.'],
      ['2', '<b>Included in this set</b>', 'How many pictures you will get (here 1). “Suggested preset” means a common size, not a size your web team confirmed.'],
      ['3', '<b>Website asset</b>', '<b>Banner</b>: a wide promotional strip. <b>Category tile</b>: a small tile that links to a category such as “Mattresses”; it adds <i>Category name</i> and <i>Category label</i> (shown as live website text or drawn into the picture).'],
      ['4', '<b>Visible branded header</b>', '<b>Yes</b>: your website’s own header, with the Duroflex logo, sits right above the banner, so the banner leaves out its own corner logo. <b>No</b>: the page has no branded header, so the banner keeps the logo.'],
      ['5', '<b>Images to deliver</b>', '<b>Current image only</b>: one desktop picture. <b>Desktop + mobile</b>: also a phone version; you then type the mobile width and height.'],
      ['6', '<b>Dimensions are from</b>', '<b>Suggested preset</b>: the Studio’s usual size. <b>Supplied specification</b>: your web team gave exact sizes; type where they come from.'],
    ], 'small')}
  `));

  // ---------- Step 7: offers ----------
  pages.push(step('offer', 2, 'Offer fields (only for a sale or price)', `
    <p class="lead">When you choose <b>Offer / price / EMI</b> in @@message@@, the form asks for the offer itself. The Studio shows this reminder: <i>“Add the exact offer, terms and dates … Offers are never invented.”</i> The values below are examples only.</p>
    <div class="two">
      ${shot('09-offer-1.png', { crop: [232, 330, 520, 290], boxes: [[244, 338, 498, 150], [244, 497, 244, 116], [498, 497, 244, 116]], marks: [[1, 246, 340], [2, 246, 499], [3, 500, 499]] })}
      ${shot('10-offer-2.png', { crop: [232, 225, 520, 420], boxes: [[244, 233, 244, 116], [244, 359, 498, 150], [244, 518, 244, 118]], marks: [[4, 246, 235], [5, 246, 361], [6, 246, 520]] })}
    </div>
    ${table(['', 'Field', 'What to write'], [
      ['', '<b>Offer or promotion</b> (Yes / No)', 'Found under <i>Sharpen targeting</i> (@@target2@@). Choosing Offer / price / EMI sets it to Yes for you. Set it to <b>No</b> if the banner has no offer; the offer fields then disappear and nothing you typed in them is used.'],
      ['1', '<b>Exact offer / price wording</b>', 'Copy it from the approved offer, letter for letter: “Year-End Sale: up to 30% off”. The banner uses these words as they are.'],
      ['2', '<b>Applicable SKU / variants</b>', 'Which products and sizes the offer covers, for example “Duropedic Airboost 6.8 · all sizes”.'],
      ['3', '<b>Offer validity</b>', '<b>Date range</b> (needs a start and an end date) or <b>Ongoing — no end date</b> (needs only a start date).'],
      ['4', '<b>Offer starts</b>', 'The first day of the offer.'],
      ['5', '<b>Conditions and exclusions</b>', 'The small print, such as “Valid on duroflexworld.com only. Cannot be combined with other offers.” Write <b>None</b> if there are none.'],
      ['6', '<b>Offer ends</b>', 'The last day. It must be after the start date.'],
    ], 'small')}
    ${note('warn', 'The Studio never invents offers, prices or urgency', 'If you leave the wording empty, the form will not let you create. It will not make up a discount, a price, an EMI, or words like “last day” without a real end date.')}
  `));

  // ---------- Step 8a: sharpen targeting ----------
  pages.push(step('target1', 2, 'Sharpen targeting (optional), part 1', `
    <p class="lead">Below the format settings there is a folded section called <b>Sharpen targeting (optional)</b>. Click it to open. Nothing here is required, but each answer helps the Studio plan a sharper banner.</p>
    <div class="two">
      ${shot('11-targeting-audience-goal.png', { crop: [222, 44, 545, 458], boxes: [[231, 122, 524, 135], [231, 268, 256, 137], [499, 268, 256, 137], [229, 420, 527, 78]], marks: [[1, 233, 124], [2, 233, 270], [3, 501, 270], [4, 231, 422]] })}
      ${shot('12-banner-options.png', { crop: [222, 135, 545, 450], boxes: [[231, 155, 256, 111], [499, 155, 256, 111], [231, 293, 256, 111], [231, 431, 524, 148]], marks: [[5, 233, 157], [6, 501, 157], [7, 233, 295], [8, 233, 433]] })}
    </div>
    ${table(['', 'Field', 'What it is for'], [
      ['1', '<b>Audience</b>', 'Who the banner speaks to: Working professionals, Families, New homeowners, Students, or <b>Add</b> your own.'],
      ['2', '<b>Age groups</b>', '18–24 up to 55+. Pick one or more, or add your own.'],
      ['3', '<b>Cities & markets</b>', 'Tier 1 / metros, Tier 2, Tier 3 or Pan India.'],
      ['4', '<b>Communication goal</b>', 'One sentence in three parts: <b>Get</b> (who) <b>to</b> (think, feel or do what) <b>by</b> (the message or benefit). Example: Get <i>families</i> to <i>choose a cooler night’s sleep</i> by <i>highlighting 1 lakh+ Airknit fibres</i>.'],
      ['5', '<b>Page and placement</b>', 'Where the banner will sit, for example “Homepage, top carousel slide”. Helps the layout.'],
      ['6', '<b>CTA destination</b>', 'The link the banner’s button opens. <b>CTA</b> means call to action, the button such as “Explore”. The link is not printed on the picture.'],
      ['7', '<b>Required file limit</b>', 'The largest file size your web team accepts, for example 500 KB. It is passed on with the brief; check the size of the file you download.'],
      ['8', '<b>Accessible image description</b>', 'A short sentence describing the picture for people who use screen readers (also called alt text).'],
    ], 'small')}
  `));

  // ---------- Step 8b ----------
  pages.push(step('target2', 2, 'Sharpen targeting (optional), part 2', `
    <p class="lead">The rest of the section covers offers, contact details, facts that must appear, and where the banner sits in the customer’s journey.</p>
    <div class="two">
      ${shot('13-promo-required-funnel.png', { crop: [222, 112, 545, 330], boxes: [[231, 119, 256, 99], [499, 119, 256, 99], [229, 262, 527, 154]], marks: [[1, 233, 121], [2, 501, 121], [3, 231, 264]] })}
      ${shot('14-funnel-insight-designs.png', { crop: [222, 22, 545, 506], boxes: [[231, 23, 256, 213], [231, 265, 524, 133], [231, 427, 256, 99]], marks: [[4, 233, 25], [5, 233, 267], [6, 233, 429]] })}
    </div>
    ${table(['', 'Field', 'What it is for'], [
      ['1', '<b>Offer or promotion</b>', '<b>Yes</b> shows the offer fields (@@offer@@). <b>No</b> hides them and leaves out any offer text you typed earlier.'],
      ['2', '<b>QR / contact details</b>', '<b>None</b>, <b>QR code</b>, <b>Contact details</b> or <b>QR + contact</b>. A QR code needs its exact link; contact details need the exact phone number or address. The Studio never makes them up.'],
      ['3', '<b>Mandatory information</b>', 'Exact facts, terms or lines that must appear on the banner, written word for word.'],
      ['4', '<b>Funnel stage</b>', 'Where the customer is. <b>TOFU</b> (top of funnel) = just discovering, <b>MOFU</b> (middle) = comparing, <b>BOFU</b> (bottom) = ready to buy. <b>Let the brief guide it</b> is the usual choice; your Objective is used first.'],
      ['5', '<b>Background / customer insight</b>', 'Anything true about the customer that explains the idea, for example “Many buyers say they wake up hot at night.”'],
      ['6', '<b>Designs per format</b>', 'Fixed at one design per format.'],
    ], 'small')}
    ${note('info', 'Where are the “planning” fields?', 'Funnel stage, customer insight and designs per format are the planning choices on today’s form. Older briefs also saved a proposition, approach, concepts, team and deadline; these still show under <b>Planning</b> in <b>Show full brief</b> (@@fullbrief@@) when a brief has them.')}
  `));

  // ---------- Step 9: look and feel ----------
  pages.push(step('look', 2, 'Look and feel, and reference pictures', `
    <p class="lead">There are no separate mood fields. Duroflex’s own look is built in: its rooms, colours, editorial photography style and real-looking Indian models come from the brand’s saved direction. To steer the look of one banner, use two things.</p>
    <ol class="do">
      <li><b>Write it in Your brief.</b> One sentence is enough: “Calm, airy bedroom in natural light.” When you say nothing, the Studio decides people, setting and lighting from the brief (the full brief then shows “Decide from the brief”).</li>
      <li><b>Add a reference picture.</b> <b>Add reference</b> uploads a picture from your computer (PNG, JPG or WebP; PDF and PowerPoint files are kept as notes only). <b>From library</b> lets you pick one of the brand’s earlier designs.</li>
    </ol>
    <div class="two">
      ${shot('15-from-library.png', { crop: [205, 160, 575, 480], boxes: [[592, 443, 178, 205]], marks: [[1, 594, 445]], caption: 'From library: pick an earlier design.' })}
      ${shot('16-reference-uses.png', { crop: [222, 385, 545, 330], boxes: [[231, 392, 210, 50], [421, 446, 292, 266]], marks: [[2, 233, 394], [3, 423, 448]], caption: 'Then choose what to borrow from it.' })}
    </div>
    ${table(['Choice', 'What the Studio does'], [
      ['<b>Not a design reference</b>', 'The picture is kept with the brief as a note and is not used to design.'],
      ['<b>Copy its layout</b>', 'Places things where the reference does: text on the left, product on the right, and so on.'],
      ['<b>Match its look</b>', 'Uses its colours, light and mood.'],
      ['<b>Use its idea</b>', 'Borrows the creative idea or story.'],
      ['<b>Layout and look</b> / <b>Layout, look and idea</b>', 'Combinations of the above.'],
    ], 'small')}
    ${note('info', 'How references are used', 'Only one picture can be the design reference. The Studio describes it in words (a small paid reading) and then makes Duroflex’s own design. Its logos, products and words are never copied, and the picture itself is never sent to the image model.')}
  `));

  // ---------- Step 10: check and create ----------
  pages.push(step('create', 3, 'Check the brief, see the estimate, create', `
    <p class="lead">When every required field is filled, the summary bar at the bottom shows a cost estimate in rupees and a <b>Create the design</b> button. Checking costs nothing; only <b>Create</b> starts paid AI work.</p>
    ${shot('17-brief-text-estimate.png', { crop: [205, 490, 575, 231], boxes: [[218, 540, 270, 165], [508, 591, 112, 34], [634, 590, 130, 36]], marks: [[1, 220, 542], [2, 506, 593], [3, 632, 592]], width: '80%' })}
    ${key([
      [1, 'Estimate.', '“Estimated ₹18–₹45 for one design per format.” It is worked out from earlier similar designs, using a dated exchange rate. It is <b>not a quote or a bill</b>; a run can cost more.'],
      [2, 'See full summary.', 'Opens <b>Review your brief</b> (stage 2, Check). Read it top to bottom; each section has <b>Edit</b>.'],
      [3, 'Create the design.', 'Starts the paid work. In the review window the same button is called <b>Confirm & create</b>.'],
    ])}
    <div class="two">
      ${shot('18-review-1.png', { crop: [24, 55, 752, 610], boxes: [[130, 174, 186, 36], [600, 609, 153, 45]], marks: [[4, 132, 176], [5, 602, 611]], caption: 'Review your brief: brand, product, request, goal.' })}
      ${shot('20-review-estimate.png', { crop: [24, 440, 752, 225], boxes: [[46, 480, 706, 80]], marks: [[6, 48, 482]], caption: 'The same estimate, just above Confirm & create.' })}
    </div>
    ${key([
      [4, 'Check.', 'You are on stage 2. <b>Back to brief</b> returns to the form without losing anything.'],
      [5, 'Confirm & create.', 'Press it only when everything is right.'],
      [6, 'Estimate again.', '“Paid AI generation starts when you confirm.”'],
    ])}
  `));

  // ---------- Step 11: waiting ----------
  pages.push(step('wait', 3, 'Wait while the Studio works', `
    <p class="lead">After Create, the project page opens. You do not need to keep it open: the work carries on by itself, and the page updates automatically. A website banner usually takes about 10–20 minutes.</p>
    <div class="two">
      ${shot('21-creating.png', { crop: [190, 90, 610, 580], boxes: [[696, 96, 82, 46], [388, 612, 82, 32]], marks: [[1, 694, 98], [2, 386, 614]], caption: 'The project page while the banner is being made.' })}
      ${shot('29-projects.png', { crop: [190, 90, 610, 520], boxes: [[205, 148, 300, 26], [205, 382, 112, 38]], marks: [[3, 205, 150], [4, 205, 384]], caption: 'Projects: the banner appears as soon as it is drawn.' })}
    </div>
    ${key([
      [1, 'Status and stage.', 'Creating, with the current stage underneath.'],
      [2, 'The design card.', 'Shows “Creating” until the picture is ready.'],
      [3, 'Status tabs.', 'Filter Projects by status: All, Draft, Creating, Ready, Check before using.'],
      [4, 'Stage under the status.', 'Planning → Generating images → Checking images.'],
    ])}
    ${table(['Status', 'What it means', 'What you do'], [
      ['<span class="pill purple">Draft</span>', 'A saved brief. Nothing has been made.', 'Open it to finish the brief.'],
      ['<span class="pill blue">Creating · Planning</span>', 'The AI writes the headline, picks the layout and plans the scene from your brief and Duroflex’s rules. The longest stage.', 'Wait.'],
      ['<span class="pill blue">Creating · Generating images</span>', 'The picture is being drawn, using the product’s real website photos.', 'Wait.'],
      ['<span class="pill blue">Creating · Checking images</span>', 'A second AI compares the picture with your brief, the product photos and the brand rules. If it finds a fixable problem it tries one correction or redraw.', 'Wait.'],
      ['<span class="pill blue">Waiting for a free slot</span>', 'Other designs are being made first. This one continues by itself.', 'Wait.'],
      ['<span class="pill green">Ready</span>', 'The design passed every saved check.', 'Look at it, edit if you like, download.'],
      ['<span class="pill amber">Check before using</span>', 'The design is saved, but a check found a problem, or could not confirm something, or the design was edited after its check.', 'Look closely before you use it (@@flagged@@).'],
      ['<span class="pill amber">Needs attention</span>', 'Creation stopped or something is missing.', 'Open the project for the reason and the recovery options.'],
    ], 'small')}
  `));

  // ---------- Step 12: results ----------
  pages.push(step('result', 3, 'Read the result: “Did it deliver?”', `
    <p class="lead">When the status turns green or amber, click the design to open it. Under the picture is the <b>Brief</b> panel: your request, its tags, the size, and the <b>Did it deliver?</b> list.</p>
    <div class="two">
      ${shot('22-design-ready.png', { crop: [190, 90, 610, 380], boxes: [[710, 98, 70, 32], [205, 250, 575, 194]], marks: [[1, 708, 100], [2, 207, 252]], caption: 'A finished Duroflex sale banner (Cocoon Cool sofa), Ready.' })}
      ${shot('23-did-it-deliver.png', { crop: [205, 290, 575, 400], boxes: [[221, 457, 160, 170], [221, 640, 100, 24]], marks: [[3, 223, 459], [4, 223, 642]], caption: 'Its Brief panel and “Did it deliver?” list.' })}
    </div>
    ${key([
      [1, 'Status.', '<b>Ready</b> means every saved check passed.'],
      [2, 'The design.', 'Shown at its real shape. Above it are the heart, the pencil (edit) and Download (@@download@@).'],
      [3, 'Did it deliver?', 'One row per kind of check, explained below.'],
      [4, 'Show full brief.', 'Everything the brief said (@@fullbrief@@).'],
    ])}
    ${table(['Row', 'What was checked'], [
      ['<b>Words</b>', 'The headline and other words match the plan, are spelt correctly and are readable.'],
      ['<b>Product</b>', 'It is the right product: its shape, colour, label and its wording, its features, its inside layers, and no extra products.'],
      ['<b>Logo</b>', 'The Duroflex logo is correct, or correctly left out.'],
      ['<b>Looks real</b>', 'Real-looking materials, light and shadows; people at the right size next to the product.'],
      ['<b>Brand look</b>', 'Background colour, kind of scene and casting follow Duroflex’s direction.'],
      ['<b>Layout</b>', 'Nothing cut off at the edges, enough calm space, the layout planned for a website banner.'],
    ], 'small')}
    <p class="small-p">Each row says <b>Delivered</b> (✓), <b>Check</b> (!) with the reason underneath, or <b>Not sure</b> (?) when the picture alone could not prove it.</p>
    ${note('info', 'Ready is not the same as approved', 'Ready means the AI checks found nothing wrong. A person should still look at the banner, read every word and confirm the offer before it goes on the website.')}
  `));

  pages.push(step('flagged', 3, 'When it says “Check before using”', `
    <p class="lead">An amber status means the design is saved, but a check found a problem or could not confirm something. Here is the real Airboost banner made for this guide.</p>
    ${shot('22a-new-banner.png', { crop: [190, 92, 610, 360], boxes: [[636, 99, 143, 30], [207, 252, 572, 190]], marks: [[1, 634, 101], [2, 209, 254]], width: '70%' })}
    ${shot('22b-new-banner-deliver.png', { crop: [205, 166, 575, 76], boxes: [[300, 209, 380, 28]], marks: [[3, 298, 211]], width: '70%', cls: 'flat' })}
    ${key([
      [1, 'Check before using.', 'The status of this design.'],
      [2, 'The banner.', 'It looks good at first sight: headline, product, button, a calm Duroflex room.'],
      [3, 'What the Studio already tried.', '“Redrawn once; the redraw was not better, so the original is kept.” After a failed check the Studio may try <b>one</b> automatic fix and keeps it only if it is better.'],
    ])}
    <h3>Finding the problem</h3>
    <p>In this design every row of <b>Did it deliver?</b> said <b>Delivered</b>. The problem was <b>text size</b>, which is not one of the six rows: the small line under the headline is about 13 pixels tall, and on a website it needs about 21 to be read comfortably.</p>
    ${shot('ba-original-crop.jpg', { crop: [0, 0, 960, 360], boxes: [[84, 182, 586, 46]], marks: [[4, 84, 184]], width: '48%', caption: 'Close-up of the original banner.' })}
    ${key([[4, 'Too small.', '“Duropedic Airboost · 1 lakh+ Airknit fibres” is hard to read at real size.']])}
    <h3>What you can do</h3>
    <ul class="check">
      <li><b>Look closely yourself.</b> Zoom in and read every word. If everything is right for how you will use it, you may decide to use it.</li>
      <li><b>Fix it with Edit with AI</b> (@@edit@@). This guide does exactly that in the following steps.</li>
      <li><b>Make it again</b> with a clearer brief, for example fewer words or a bigger supporting line. <b>Duplicate</b> in the ⋮ menu starts a new brief from this one.</li>
    </ul>
  `));

  // ---------- Step 12b: full brief ----------
  pages.push(step('fullbrief', 3, 'Show full brief', `
    <p class="lead">At the bottom of the Brief panel, <b>Show full brief</b> lists everything the brief form asked, grouped the same way. Use it to check what a design was asked to do, or to copy a teammate’s brief.</p>
    <div class="two">
      ${shot('24-full-brief-1.png', { crop: [205, 50, 575, 600], boxes: [[221, 124, 545, 342], [221, 487, 545, 135]], marks: [[1, 223, 126], [2, 223, 489]] })}
      ${shot('25-full-brief-2.png', { crop: [205, 110, 575, 570], boxes: [[221, 120, 545, 470], [221, 624, 545, 42]], marks: [[3, 223, 122], [4, 223, 626]] })}
    </div>
    ${key([
      [1, 'Campaign.', 'Product, product page, objective, message type, language, the features (“Reasons to believe”), audience, goal and so on.'],
      [2, 'Look and feel.', 'People, setting and lighting. “Decide from the brief” means you left them to the Studio. A design reference appears here too, with what to borrow.'],
      [3, 'This format.', 'Every format setting and, for an offer banner, the exact offer wording, products, dates and conditions.'],
      [4, 'Not given.', 'Fields left empty are named once, so you can see what the Studio was not told.'],
    ])}
    ${note('info', 'Other groups you may see', '<b>References</b> (pictures added as notes), <b>Other formats in this brief</b> (for campaigns with several formats) and <b>Planning</b> (only on older briefs).')}
  `));

  // ---------- Edit with AI ----------
  pages.push(step('edit', 4, 'Edit with AI: pins and comments', `
    <p class="lead">Open the design and click the <b>pencil</b> button next to Download. The image editor opens with the <b>Edit with AI</b> panel. You point at what to change with numbered <b>pins</b> and write one comment per pin.</p>
    ${shot('27-editor-open.png', { crop: [0, 0, 800, 600], boxes: [[264, 83, 272, 45], [10, 455, 80, 100], [664, 14, 130, 40]], marks: [[1, 262, 85], [2, 8, 457], [3, 662, 16]], width: '52%' })}
    ${key([
      [1, 'Which version you are looking at.', '“Original · in use”. Every edit starts from the version in use.'],
      [2, 'Versions.', 'The original stays here forever. Each edit adds a new version beside it.'],
      [3, 'Saved as a new version.', 'Nothing you do here changes the original picture.'],
    ])}
    ${shot('30-edit-pin.png', { crop: [110, 150, 600, 200], boxes: [[220, 248, 26, 26], [250, 180, 253, 152]], marks: [[4, 216, 246], [5, 252, 182]], width: '58%', caption: 'Click the design: a numbered pin drops and asks what to change.' })}
    ${shot('31-edit-ready.png', { crop: [0, 445, 800, 160], boxes: [[10, 449, 780, 34], [10, 489, 780, 80], [743, 571, 47, 32]], marks: [[6, 8, 451], [7, 8, 491], [8, 741, 573]], width: '70%' })}
    ${key([
      [4, 'Pin 1.', 'Click exactly on the thing you mean. Here: the small line under the headline. You can drop up to 12 pins.'],
      [5, 'What should change here?', 'Write one clear change, then click <b>Done</b>. Example: “Make this small line about twice as big so it is easy to read. Keep the same words.”'],
      [6, 'Your pins.', 'Each pin with its comment. Click it to edit, or × to remove it.'],
      [7, 'Anything else? (optional)', 'A general <b>note</b>. Leave it empty when pins say it all: <b>a note can change the whole picture</b>. Use it for whole-picture changes such as “Make the lighting warmer”.'],
      [8, 'Send.', 'One paid edit per click. Below it the editor shows the cost first: about <b>₹7</b> for the edit plus about <b>₹5</b> for its product check (estimates).'],
    ])}
    ${note('info', 'How far a change goes', 'A pin only shows the AI what you mean; your comment decides how far the change reaches. A pin on a wall with “make this wall dark blue” changes the whole wall. Everything your comments don’t ask about is put back exactly as it was.')}
  `));

  pages.push(step('versions', 4, 'Versions and the product check', `
    <p class="lead">After <b>Send</b>, a new version appears with “Creating…”. About a minute later it is ready, and the Studio has already run a quick <b>product check</b> on it. A new version is shown, but it is <b>not used</b> until you choose it.</p>
    ${shot('34-edit-check-result.png', { crop: [0, 80, 800, 490], boxes: [[254, 84, 293, 44], [538, 331, 106, 30], [651, 331, 134, 30], [92, 404, 74, 110], [12, 524, 776, 46]], marks: [[1, 252, 86], [2, 536, 333], [3, 649, 333], [4, 90, 406], [5, 10, 526]], width: '84%' })}
    ${key([
      [1, 'What you are looking at.', 'Here: “Version 1 · Check found a problem”.'],
      [2, 'Use this version.', 'Makes this version the one in use. Downloads and new edits then use it.'],
      [3, 'Back to version in use.', 'Leaves things as they were. Nothing is lost; the new version stays in the list.'],
      [4, 'Versions.', 'Original, Version 1, Version 2 … with each one’s check result underneath. Click one to look at it.'],
      [5, 'What the check saw.', 'Every request and its result, in plain words. Scroll this box to see each version.'],
    ])}
    ${table(['Product check result', 'What it means'], [
      ['<b>Product checked</b>', 'The product still looks right, the edit did what you asked, and nothing else seems damaged.'],
      ['<b>Checked, some unsure</b>', 'The check could not tell everything from the picture. Look at those points yourself.'],
      ['<b>Check found a problem</b>', 'Something is wrong: read the reason. Usually go back to the version in use and try again.'],
      ['<b>Not checked</b>', 'The check could not run. The version is kept, but unchecked. Look carefully before using it.'],
    ], 'small')}
    ${note('warn', 'An edited version is never “Ready”', 'The product check is a quick safety check, not the full check a new design gets. After an edit the design always shows <b>Check before using</b>, so read the words and look at the product yourself.')}
  `));

  pages.push(step('example', 4, 'A real example: three tries, one keeper', `
    <p class="lead">To fix the too-small line from @@flagged@@, three edits were sent for this guide. Each started from the original. Here is what came back, close up.</p>
    <div class="ba">
      <figure><img src="screens/ba-original-crop.jpg" alt=""><figcaption><b>Original.</b> The small line is too small at real size.</figcaption></figure>
      <figure><img src="screens/ba-edit1-crop.jpg" alt=""><figcaption><b>Version 1 · pin.</b> Line barely bigger, a stray “.” after “cooler.”, a pale patch to its left. <span class="bad">Check found a problem.</span></figcaption></figure>
      <figure><img src="screens/ba-edit2-crop.jpg" alt=""><figcaption><b>Version 2 · clearer pin comment.</b> Line a little bigger and bolder, nothing else changed. <span class="good">Product checked.</span></figcaption></figure>
      <figure><img src="screens/ba-edit3-crop.jpg" alt=""><figcaption><b>Version 3 · note only.</b> The whole picture was redrawn slightly larger and the right edge broke. <span class="bad">Check found a problem.</span></figcaption></figure>
    </div>
    ${table(['Try', 'What was written', 'What we learned'], [
      ['Version 1', 'Pin on the line: “Make this small line about twice as big so it is easy to read. Keep the same words.”', 'Changing the size of text is one of the hardest edits. Read the check: it caught all three problems.'],
      ['Version 2', 'Pin on the line: “Enlarge this line so its letters are as tall as the word “Explore” on the button below. Keep the exact words “Duropedic Airboost · 1 lakh+ Airknit fibres”, the same font and colour. Change nothing else.”', 'A precise comment with the exact words and something to compare with worked better. Its check passed, but by eye the line is only a little bigger and bolder, not as tall as “Explore”. Always compare with your own eyes.'],
      ['Version 3', 'No pin. Note: “Make the small line … about 60% bigger … Keep everything else exactly as it is.”', 'A note re-draws the whole picture: the headline, button and room all moved a little, and the right edge was damaged.'],
    ], 'small')}
    ${shot('36-edit-note.png', { crop: [0, 488, 800, 92], boxes: [[10, 510, 780, 58]], marks: [[1, 8, 512]], width: '86%', caption: 'Version 3: a note typed in “Anything else?”, with no pins.' })}
    ${note('tip', 'What to do when an edit is not enough', 'Use the best version you have (here Version 2), or make the banner again with a clearer brief, for example: “Keep the supporting line short and large.” For this banner, one new design (₹34.01) cost about as much as four edits (about ₹8.50 each).')}
  `));

  pages.push(step('choose', 4, 'Choose a version, or go back to the original', `
    <p class="lead">For this guide, Version 2 was chosen: its check passed and nothing else in the picture changed.</p>
    ${shot('38-v2-in-use.png', { crop: [0, 80, 800, 345], boxes: [[249, 84, 302, 44], [172, 372, 74, 54]], marks: [[1, 247, 86], [2, 170, 374]], width: '64%', caption: 'After “Use this version”: Version 2 is in use.' })}
    ${key([
      [1, 'Version 2 · in use.', 'The design page, downloads and any new edits now use Version 2. The editor confirms: “Now using Version 2. Downloads and new edits use this version.”'],
      [2, 'In use.', 'The version in use has a purple outline.'],
    ])}
    <h3>Going back to the original</h3>
    ${shot('39-restore-original.png', { crop: [0, 80, 800, 345], boxes: [[287, 84, 228, 44], [12, 372, 74, 54], [538, 331, 106, 30]], marks: [[3, 285, 86], [4, 10, 374], [5, 536, 333]], width: '64%' })}
    ${key([
      [3, 'Viewing the original.', 'Click <b>Original</b> in the versions row.'],
      [4, 'Original · Saved image.', 'It is never changed by any edit.'],
      [5, 'Use this version.', 'Makes the original the version in use again. This is how you undo every edit. It is free and you can switch back at any time.'],
    ])}
    ${shot('40-design-edited.png', { crop: [190, 92, 610, 360], boxes: [[636, 99, 143, 30]], marks: [[6, 634, 101]], width: '50%', caption: 'Back on the design page, Version 2 is shown.' })}
    ${key([[6, 'Check before using.', 'An edited design always shows this. Look at it yourself, then download it.']])}
  `));

  // ---------- Step 15: re-run check, layer editor ----------
  pages.push(step('recheck', 4, 'Re-run check, and the layer editor', `
    <h3>Re-run check</h3>
    <p>Sometimes a design is saved but its check never finished (for example the internet dropped). The design page then offers <b>Re-run check</b>.</p>
    ${shot('28-rerun-check.png', { crop: [190, 90, 610, 470], boxes: [[636, 99, 142, 30], [207, 341, 571, 210], [231, 484, 128, 43]], marks: [[1, 634, 101], [2, 209, 343], [3, 229, 486]], width: '76%', caption: 'Example from a Duroflex social post whose check was interrupted.' })}
    ${key([
      [1, 'Check before using.', 'A design without a finished check is never shown as Ready.'],
      [2, 'What Re-run check does.', 'It sends <b>one new check</b> of the same saved design and shows its cost (here about ₹1, estimate). It never draws a new picture and never corrects anything afterwards.'],
      [3, 'Re-run check.', 'One click = one paid check. The earlier, unfinished check may also have been charged; that cost stays marked as unknown.'],
    ])}
    <p>The button only appears when a check is missing, was interrupted or failed. A design whose check finished (Ready or Check before using) does not show it.</p>
    <h3>The layer editor</h3>
    <p>Older designs could be opened in a <b>layer editor</b>, where text, logo and shapes were separate layers you could move. <b>Designs made today cannot be opened in the layer editor.</b> The pencil button on a new design always opens the image editor with Edit with AI (@@edit@@), because the words are part of the picture. To change words, drop a pin on them and write the new wording.</p>
    ${note('tip', 'Changing words with a pin', 'Write the exact new words in quotes: Pin on the headline → <i>Change the text to “A lakh reasons to sleep cooler.” in the same font and size.</i> Then check the spelling in the new version yourself.')}
  `));

  // ---------- Step 16: download ----------
  pages.push(step('download', 4, 'Download the banner', `
    <p class="lead">When you are happy with the design, download it from its design page.</p>
    ${shot('26-design-menu.png', { crop: [190, 90, 610, 380], boxes: [[546, 207, 32, 32], [586, 207, 32, 32], [624, 207, 110, 32], [572, 250, 206, 120]], marks: [[1, 544, 209], [2, 584, 209], [3, 622, 209], [4, 570, 252]], width: '82%' })}
    ${key([
      [1, 'Heart.', 'Adds the design to <b>Favourites</b> so you can find it again. It does not approve it.'],
      [2, 'Pencil.', 'Opens the image editor (@@edit@@).'],
      [3, 'Download.', 'Saves the version in use to your computer as a PNG at its exact size, 1920 × 640. If you chose an edited version, that is the one you get.'],
      [4, 'More (⋮).', '<b>Duplicate</b> starts a new brief from this one. <b>Campaign & tags</b> files it in a campaign. <b>Move to Trash</b> hides it in this browser; you can restore it from Trash.'],
    ])}
    <h3>Before you send it to the web team</h3>
    <ul class="check">
      <li>The status is <b>Ready</b>, or you have looked closely at every reason it says <b>Check before using</b>.</li>
      <li>The product, its size and every word on the banner are correct. Read the small text too.</li>
      <li>Any offer wording, dates and conditions match the approved offer exactly.</li>
      <li>The file is 1920 × 640 and under your web team’s file limit.</li>
      <li>Downloading does not publish anything. Putting the banner on the website is done separately by the web team.</li>
    </ul>
  `));

  // ---------- Tips ----------
  pages.push({ kind: 'tips' });
  pages.push({ kind: 'glossary' });
  return pages;
}

const css = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
:root { --ink:#1d1a33; --muted:#5f5b75; --line:#e4e1ee; --accent:#5b3fd0; --accent-2:#efeafe; --mark:#f0541e; --mark-soft:rgba(240,84,30,.10); --red:#e3342f; --amber:#a35d00; --amber-bg:#fff5e3; --green:#21744a; --green-bg:#e8f5ee; --blue-bg:#eef3ff; }
html, body { margin:0; padding:0; background:#fff; color:var(--ink); font-family: -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif; font-size:9.6pt; line-height:1.48; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
h1, h2, h3, .kicker, .cover-title { font-family: "Avenir Next", "Avenir", -apple-system, sans-serif; }
.page { width:210mm; height:297mm; padding:15mm 16mm 17mm; position:relative; overflow:hidden; page-break-after:always; break-after:page; }
.page:last-child { page-break-after:auto; }
.foot { position:absolute; left:16mm; right:16mm; bottom:8mm; display:flex; justify-content:space-between; font-size:7.5pt; color:var(--muted); border-top:1px solid var(--line); padding-top:2.2mm; }
.kicker { font-size:8pt; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin:0 0 1.5mm; }
h1 { font-size:20pt; line-height:1.15; margin:0 0 3mm; font-weight:700; letter-spacing:-.01em; }
h3 { font-size:11pt; margin:4mm 0 1.6mm; font-weight:700; }
p { margin:0 0 2.4mm; }
.lead { font-size:10.4pt; color:#2c2945; margin-bottom:3.6mm; }
.small-p { font-size:8.8pt; color:var(--muted); margin:1.4mm 0 2.4mm; }
code { font-family: "SF Mono", Menlo, monospace; font-size:8.6pt; background:#f4f2fa; padding:.2mm 1.2mm; border-radius:1mm; }
.shot { margin:0 auto 2.6mm; }
.shot .crop { position:relative; overflow:hidden; border-radius:2mm; box-shadow:0 0 0 1px #d8d4e6, 0 1.2mm 3.5mm rgba(30,20,70,.10); background:#fff; }
.shot.flat .crop { box-shadow:0 0 0 1px #d8d4e6; }
.shot img { position:absolute; display:block; max-width:none; height:auto; }
.shot figcaption { font-size:7.8pt; color:var(--muted); text-align:center; margin-top:1.4mm; }
.hl { position:absolute; border:2px solid var(--mark); border-radius:1.6mm; background:var(--mark-soft); }
.mark { position:absolute; width:5.6mm; height:5.6mm; margin:-2.8mm 0 0 -2.8mm; border-radius:50%; background:var(--mark); color:#fff; font:700 8pt/5.6mm -apple-system, sans-serif; text-align:center; border:.5mm solid #fff; box-shadow:0 .5mm 1.5mm rgba(0,0,0,.28); }
.key { list-style:none; padding:0; margin:0 0 2.6mm; display:grid; gap:1.5mm; }
.key li { display:flex; gap:2.4mm; align-items:flex-start; font-size:9pt; }
.kn { flex:none; width:5mm; height:5mm; border-radius:50%; background:var(--mark); color:#fff; font:700 7.5pt/5mm -apple-system, sans-serif; text-align:center; margin-top:.3mm; }
.two { display:grid; grid-template-columns:1fr 1fr; gap:5mm; align-items:start; }
.two.wide-left { grid-template-columns:1.25fr 1fr; }
.do { margin:0 0 3mm; padding-left:5mm; }
.do li { margin-bottom:1.4mm; }
.ways { display:grid; grid-template-columns:repeat(3,1fr); gap:3mm; margin:0 0 3.5mm; }
.ways > div { border:1px solid var(--line); border-radius:2.4mm; padding:2.6mm 3mm; font-size:8.8pt; background:#fbfaff; }
.way { display:inline-block; width:5.6mm; height:5.6mm; border-radius:1.4mm; background:var(--accent); color:#fff; font:700 8.5pt/5.6mm -apple-system, sans-serif; text-align:center; margin-right:1.6mm; }
.note { border-radius:2.4mm; padding:2.8mm 3.6mm; margin:2.6mm 0; font-size:8.9pt; border-left:1.4mm solid; }
.note > b { display:block; margin-bottom:.6mm; font-size:9.2pt; }
.note.info { background:var(--blue-bg); border-color:#5b7be0; }
.note.tip { background:var(--green-bg); border-color:#2e9b63; }
.note.warn { background:var(--amber-bg); border-color:#e39a1c; }
table { width:100%; border-collapse:collapse; margin:1mm 0 2.6mm; font-size:8.6pt; }
th { text-align:left; font-size:7.5pt; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); border-bottom:1.4px solid var(--ink); padding:1.2mm 2mm; }
td { border-bottom:1px solid var(--line); padding:1.5mm 2mm; vertical-align:top; }
td.f { white-space:nowrap; }
table.small td { padding:1.25mm 2mm; }
.dot { display:inline-block; width:3mm; height:3mm; border-radius:50%; }
.dot.g { background:#3f7a5a; } .dot.b { background:#8a5a2b; } .dot.r { background:#b8323a; }
.pill { display:inline-block; padding:.4mm 2.2mm; border-radius:4mm; font-size:7.8pt; font-weight:600; white-space:nowrap; }
.pill.purple { background:#f1e8fb; color:#7a2f8f; } .pill.blue { background:#ece9fd; color:#4c36b8; } .pill.green { background:var(--green-bg); color:var(--green); } .pill.amber { background:var(--amber-bg); color:var(--amber); }
ul.check { padding-left:0; list-style:none; margin:0; }
ul.check li { padding-left:7mm; position:relative; margin-bottom:1.6mm; }
ul.check li::before { content:""; position:absolute; left:0; top:.6mm; width:3.6mm; height:3.6mm; border:1.4px solid var(--accent); border-radius:.8mm; }
/* Cover */
.cover { padding:0; background:#17132e; color:#fff; }
.cover .band { position:absolute; inset:0; background:radial-gradient(120% 80% at 85% 0%, #3d2a9c 0%, #17132e 62%); }
.cover .inner { position:absolute; left:18mm; right:18mm; top:24mm; }
.cover .brandline { display:flex; align-items:center; gap:3mm; font-size:9pt; letter-spacing:.14em; text-transform:uppercase; color:#cfc6ff; font-weight:600; }
.cover .brandline i { width:9mm; height:1px; background:#cfc6ff; display:inline-block; }
.cover-title { font-size:36pt; line-height:1.04; font-weight:700; margin:9mm 0 5mm; letter-spacing:-.02em; }
.cover-title em { font-style:normal; color:#ff7a59; }
.cover .sub { font-size:12.5pt; color:#ddd8f5; max-width:150mm; line-height:1.45; }
.cover .hero { position:absolute; left:18mm; right:18mm; top:92mm; border-radius:3mm; overflow:hidden; box-shadow:0 4mm 12mm rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.14); }
.cover .hero img { width:100%; display:block; }
.cover .hero-cap { position:absolute; left:18mm; right:18mm; top:155mm; font-size:8pt; color:#b9b2df; }
.cover .learn { position:absolute; left:18mm; right:18mm; top:196mm; font-size:9.6pt; color:#ddd8f5; }
.cover .learn b { display:block; color:#fff; font-family:"Avenir Next", sans-serif; font-size:11pt; margin-bottom:2mm; }
.cover .learn ul { margin:0; padding:0; list-style:none; columns:2; column-gap:8mm; }
.cover .learn li { padding-left:5mm; position:relative; margin-bottom:1.8mm; break-inside:avoid; }
.cover .learn li::before { content:"→"; position:absolute; left:0; color:#ff9a7f; }
.cover .meta { position:absolute; left:18mm; right:18mm; bottom:20mm; display:grid; grid-template-columns:repeat(3,1fr); gap:6mm; font-size:8.6pt; color:#ddd8f5; border-top:1px solid rgba(255,255,255,.18); padding-top:5mm; }
.cover .meta b { display:block; color:#fff; font-size:9pt; margin-bottom:.8mm; }
/* Contents */
.toc { list-style:none; padding:0; margin:0 0 5mm; columns:1; }
.toc li { display:flex; align-items:baseline; gap:2mm; padding:1.25mm 0; border-bottom:1px dotted #d7d3e4; font-size:9.6pt; }
.toc .n { width:9mm; color:var(--accent); font-weight:700; }
.toc .t { flex:1; }
.toc .p { color:var(--muted); font-variant-numeric:tabular-nums; }
.toc .n { white-space:nowrap; width:14mm; flex:none; }
.toc li.part { border-bottom:none; padding:3.4mm 0 1mm; font-family:"Avenir Next", sans-serif; font-weight:700; font-size:10.5pt; color:var(--ink); gap:3mm; }
.toc li.part span { font-size:7.5pt; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); width:14mm; }
.cover .parts { position:absolute; left:18mm; right:18mm; top:166mm; display:grid; grid-template-columns:repeat(4,1fr); gap:4mm; }
.cover .parts div { border:1px solid rgba(255,255,255,.18); border-radius:2.4mm; padding:3.2mm 3.4mm; background:rgba(255,255,255,.04); }
.cover .parts span { display:block; font-size:7.5pt; letter-spacing:.12em; text-transform:uppercase; color:#ff9a7f; margin-bottom:1mm; font-weight:600; }
.cover .parts b { font-family:"Avenir Next", sans-serif; font-size:11pt; color:#fff; }
.flow { display:flex; align-items:stretch; gap:1.6mm; margin:2mm 0 4mm; }
.flow div { flex:1; border-radius:2mm; padding:2.4mm 2mm; background:var(--accent-2); font-size:8pt; text-align:center; line-height:1.3; }
.flow div b { display:block; font-size:8.6pt; color:var(--accent); margin-bottom:.6mm; }
.flow span { align-self:center; color:var(--muted); font-size:10pt; }
/* Glossary */
.gloss { columns:2; column-gap:8mm; font-size:8.7pt; }
.gloss div { break-inside:avoid; margin-bottom:2.2mm; }
.gloss b { color:var(--accent); }
.tips { display:grid; grid-template-columns:1fr 1fr; gap:3.6mm; }
.tip { border:1px solid var(--line); border-radius:2.4mm; padding:3mm 3.4mm; font-size:8.9pt; break-inside:avoid; }
.tip h4 { margin:0 0 1.2mm; font-size:10pt; font-family:"Avenir Next", sans-serif; }
.tip .eg { display:block; margin-top:1.4mm; font-size:8.4pt; }
.bad { color:#a8322e; font-weight:600; } .good { color:var(--green); font-weight:600; }
.ba { display:grid; grid-template-columns:1fr 1fr; gap:3mm 4mm; margin:1mm 0 3mm; }
.ba figure { margin:0; } .ba img { width:100%; display:block; border-radius:1.6mm; border:1px solid #d8d4e6; }
.ba figcaption { font-size:7.8pt; color:var(--muted); margin-top:1mm; text-align:center; }
`;

const PARTS = { 1: 'Get started', 2: 'Fill in the brief', 3: 'Create and check', 4: 'Edit and download' };
function render(pages) {
  let num = 0;
  const footer = (n) => `<div class="foot"><span>Creative AI Studio · Making a Duroflex website banner</span><span>${n}</span></div>`;
  const tocRows = [];
  const html = pages.map((pg) => {
    num += 1;
    if (pg.kind === 'cover') return coverPage();
    if (pg.kind === 'contents') return null; // filled after numbering
    if (pg.kind === 'intro') { tocRows.push(['', 'Before you start: how it works and what costs money', num, 0]); return ref(introPage(footer(num))); }
    if (pg.kind === 'step') { tocRows.push([pg.n, pg.title, num, pg.part]); return `<section class="page"><div class="kicker">Step ${pg.n} of ${steps.length} · ${PARTS[pg.part]}</div><h1>${pg.title}</h1>${ref(pg.body)}${footer(num)}</section>`; }
    if (pg.kind === 'tips') { tocRows.push(['', 'Tips and common mistakes', num, 5]); return tipsPage(num, footer); }
    if (pg.kind === 'glossary') { tocRows.push(['', 'Glossary: words used in the Studio', num, 5]); return glossaryPage(num, footer); }
    return '';
  });
  html[1] = contentsPage(tocRows, footer(2));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Make a Duroflex website banner · Creative AI Studio guide</title><style>${css}</style></head><body>${html.join('\n')}</body></html>`;
}

function coverPage() {
  return `<section class="page cover"><div class="band"></div><div class="inner">
    <div class="brandline"><i></i>Creative AI Studio · Beginner’s guide</div>
    <div class="cover-title">Make a Duroflex<br><em>website banner</em></div>
    <p class="sub">A step-by-step guide for first-time users: from an empty brief to a finished, edited banner, with real screenshots and every option explained in plain words.</p>
  </div>
  <div class="hero"><img src="screens/banner-final.jpg" alt=""></div>
  <div class="hero-cap">The banner made while writing this guide: Duropedic Airboost, 1920 × 640 pixels, after one Edit with AI.</div>
  <div class="parts">${[1, 2, 3, 4].map((p) => `<div><span>Part ${p}</span><b>${PARTS[p]}</b></div>`).join('')}</div>
  <div class="learn"><b>You will learn to</b><ul><li>fill in every field of the brief, and know which ones matter</li><li>read the ₹ estimate before anything is paid for</li><li>tell <i>Ready</i> from <i>Check before using</i>, and find out why</li><li>fix a design with pins and comments in Edit with AI</li><li>choose the right version and download it</li></ul></div>
  <div class="meta"><div><b>Who it is for</b>Anyone opening the Studio for the first time. No design or AI knowledge needed.</div><div><b>How long it takes</b>About 20 minutes to fill the brief, then 10–20 minutes while the Studio works.</div><div><b>Version</b>Studio as of 25 November 2026. Costs are estimates in ₹ (INR), not bills.</div></div>
  </section>`;
}

function contentsPage(rows, foot) {
  let html = '', part = -1;
  for (const [n, t, p, pt] of rows) {
    if (pt !== part) { part = pt; if (PARTS[pt]) html += `<li class="part"><span>Part ${pt}</span>${PARTS[pt]}</li>`; else if (pt === 5) html += '<li class="part"><span>Extras</span>Reference</li>'; }
    html += `<li><span class="n">${n ? 'Step ' + n : ''}</span><span class="t">${t}</span><span class="p">${p}</span></li>`;
  }
  return `<section class="page"><div class="kicker">Contents</div><h1>What this guide covers</h1><ul class="toc">${html}</ul>${foot}</section>`;
}

function introPage(foot) {
  return `<section class="page"><div class="kicker">Before you start</div><h1>How the Studio makes a banner</h1>
  <p class="lead">The Creative AI Studio turns a written brief into a finished picture. You describe what you want; AI does the writing, drawing and checking; you review, fix and download.</p>
  <div class="flow"><div><b>1 · Brief</b>You fill in the form</div><span>→</span><div><b>2 · Plan</b>AI writes the words and plans the layout</div><span>→</span><div><b>3 · Draw</b>AI draws it with the product’s real photos</div><span>→</span><div><b>4 · Check</b>A second AI checks it against the brief and Duroflex’s rules</div><span>→</span><div><b>5 · You</b>Review, edit with AI, download</div></div>
  <h3>What you need</h3>
  <ul class="check">
    <li>The Studio link and your own sign-in.</li>
    <li>The Duroflex product the banner is about, and its size if it matters.</li>
    <li>What the banner should say. For a sale: the exact offer wording, dates and conditions, as approved.</li>
    <li>About 20 minutes for the brief. The Studio then needs 10–20 minutes on its own.</li>
  </ul>
  <h3>What costs money</h3>
  <p>Filling in and checking the brief is free. These steps use paid AI services. The Studio always shows an estimate in rupees first.</p>
  ${table(['Action', 'Estimate shown', 'What it cost for this guide'], [
    ['<b>Create</b> one website banner', '₹18–₹45', '₹34.01 (planning, drawing, checking, and one automatic redraw)'],
    ['Home brief box reading', '—', '₹0.30'],
    ['Each <b>Send</b> in Edit with AI', 'about ₹7 + about ₹5 for its check', '₹8.29, ₹8.72 and ₹8.74 for the three edits'],
    ['<b>Re-run check</b>', 'shown on the button, here about ₹1', 'not used'],
  ], 'small')}
  <p class="small-p">All amounts are estimates in ₹ worked out from the AI providers’ list prices at the RBI reference rate of 9 Oct 2026 (₹96.61 per US dollar). They are not bills. Total for everything made for this guide: about <b>₹60.07</b>. When the Studio cannot measure a cost it shows it as unknown, never as zero.</p>
  ${note('info', 'Two brands, kept apart', 'The Studio serves Duroflex and Sleepyhead. Each brand has its own products, photos, colours, rooms, models and rules. Nothing is shared between them, so always check which brand is switched on (@@open@@).')}
  ${foot}</section>`;
}

function tipsPage(num, footer) {
  const tips = [
    ['Write the exact offer wording', 'Copy the approved offer letter for letter, with its dates and conditions. The banner uses your words as they are.', 'Bad: “some discount for year end”', 'Good: “Year-End Sale: up to 30% off” · 20–31 Dec 2026 · Valid on duroflexworld.com only.'],
    ['The Studio never invents offers', 'No offer in the brief means no offer on the banner. It will not make up a price, EMI, discount or “last day” urgency. If the offer fields are empty, the form stops you.', '', ''],
    ['Turn an offer off properly', 'If a banner should have no offer, set <b>Offer or promotion</b> to <b>No</b> and choose a message type such as Benefit. Also delete sale words from <b>Your brief</b>. (The design page may still show an old “Offer:” tag; the banner itself leaves it out.)', '', ''],
    ['Short product names in ad copy', 'On banners the Studio writes the short name, without the size, colour or model number.', 'Long: “Duropedic Airboost 6.8 Arctic Ice Mattress”', 'Short: “Duropedic Airboost”'],
    ['One change per pin', 'Give each pin one clear job. Several small pins work better than one pin with a long list.', 'Bad: one pin saying “bigger text, warmer light, move the lamp”', 'Good: Pin 1 “make this line bigger” · Pin 2 “remove this lamp”'],
    ['Leave the note empty when pins say it all', 'A general note can change the whole picture. Use it only for whole-picture changes such as “make the lighting warmer”.', '', ''],
    ['Pick the right size first', 'Check the variant before you create. A wrong size can change the product’s thickness, and an offer may apply to one size only.', '', ''],
    ['Read the small text', '“Check before using” with every row Delivered usually means some text is too small at real size. Zoom in and read every line.', '', ''],
    ['Edited versions need your eyes', 'An edited version is never marked Ready. It gets a product check only, so check the words and layout yourself before using it.', '', ''],
    ['Downloading is not publishing', 'Download gives you a file. Putting it on the website, and any approvals, happen outside the Studio.', '', ''],
  ];
  return `<section class="page"><div class="kicker">Before you go</div><h1>Tips and common mistakes</h1>
  <div class="tips">${tips.map(([h, b, bad, good]) => `<div class="tip"><h4>${h}</h4>${b}${bad ? `<span class="eg bad">✕ ${bad}</span>` : ''}${good ? `<span class="eg good">✓ ${good}</span>` : ''}</div>`).join('')}</div>
  ${footer(num)}</section>`;
}

function glossaryPage(num, footer) {
  const g = [
    ['Brief', 'Your written instruction: what to make, for which product, saying what.'],
    ['Format', 'The kind of picture and its size, such as Website Banner 1920 × 640.'],
    ['Pixels (px)', 'The tiny dots a screen picture is made of. 1920 × 640 means 1920 dots wide, 640 tall.'],
    ['Draft', 'A saved brief that has not been created yet.'],
    ['Project', 'One created brief with all its designs, shown in Projects.'],
    ['Design', 'One finished picture inside a project.'],
    ['SKU', 'The shop’s code for one exact product in one size.'],
    ['Variant', 'One version of a product, usually a size (Queen 72 × 60).'],
    ['Objective', 'What the banner should achieve: awareness, consideration, purchase, engagement or education.'],
    ['Message type', 'The kind of message (“What should it say?”): benefit, launch, offer, proof, technology, comparison or store news.'],
    ['Features to highlight', 'Product facts from the official page that the banner may use. Also called reasons to believe.'],
    ['Funnel stage', 'Where the customer is: TOFU (discovering), MOFU (comparing), BOFU (ready to buy).'],
    ['Communication goal', 'Get (who) to (do or feel what) by (which message).'],
    ['CTA', 'Call to action: the button, such as “Explore” or “Shop now”.'],
    ['CTA destination', 'The web link the button opens. Not printed on the picture.'],
    ['Branded header', 'Your website’s own top bar with the logo. If it is visible, the banner leaves out its own logo.'],
    ['Alt text', 'Accessible image description: a sentence that tells screen-reader users what the picture shows.'],
    ['Reference picture', 'A picture you add to guide the layout, look or idea. Never copied.'],
    ['Estimate', 'The expected cost in ₹, worked out from similar earlier work. Not a quote or bill.'],
    ['Planning', 'The first stage: the AI writes the words and plans layout and scene.'],
    ['Check', 'A second AI compares the picture with the brief, the product photos and brand rules.'],
    ['Did it deliver?', 'The six-row summary of the check: Words, Product, Logo, Looks real, Brand look, Layout.'],
    ['Ready', 'Every saved check passed.'],
    ['Check before using', 'Saved, but something failed, was not confirmed, or the design was edited after its check.'],
    ['Correction / redraw', 'One automatic fix the Studio may try after a failed check. It keeps the result only if it is better.'],
    ['Edit with AI', 'Changing a design by dropping pins with comments and pressing Send.'],
    ['Pin', 'A numbered pointer on the design with one comment saying what to change there.'],
    ['Note', 'The optional “Anything else?” text in the editor. It can change the whole picture.'],
    ['Version', 'The original and each edit, kept side by side. “In use” is the one you download.'],
    ['Product check', 'The quick check every edited version gets: is the product still right?'],
    ['Re-run check', 'One new check of a saved design whose check never finished.'],
    ['Layer editor', 'An older editor with movable text layers. Not available for designs made today.'],
    ['Brand switch', 'The Duroflex / Sleepyhead toggle at the top. Decides whose products and rules you use.'],
  ];
  return `<section class="page"><div class="kicker">Reference</div><h1>Glossary: words used in the Studio</h1>
  <div class="gloss">${g.map(([t, d]) => `<div><b>${t}</b> — ${d}</div>`).join('')}</div>${footer(num)}</section>`;
}

module.exports = { shot, key, note, table, step, steps };

async function main() {
  for (const f of fs.readdirSync(path.join(dir, 'screens')).filter((f) => /\.(png|jpg)$/.test(f))) {
    const m = await sharp(path.join(dir, 'screens', f)).metadata();
    sizes[f] = { w: m.width, h: m.height };
  }
  const pages = buildPages();
  const html = render(pages);
  fs.writeFileSync(htmlPath, html);
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Any page whose content runs into its footer is reported (content must fit one A4 page).
  const overflow = await page.evaluate(() => [...document.querySelectorAll('section.page')].map((sec, i) => {
    const foot = sec.querySelector('.foot'); if (!foot) return null;
    const limit = foot.getBoundingClientRect().top - 2;
    const bottom = Math.max(...[...sec.children].filter((c) => c !== foot).map((c) => c.getBoundingClientRect().bottom));
    return bottom > limit ? `page ${i + 1}: ${Math.round(bottom - limit)} px too long` : null;
  }).filter(Boolean));
  if (overflow.length) console.warn('Overflow:\n' + overflow.join('\n'));
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
  // Remove screenshots the guide no longer uses.
  const used = fs.readFileSync(htmlPath, 'utf8');
  for (const f of fs.readdirSync(path.join(dir, 'screens'))) if (!used.includes('screens/' + f)) fs.unlinkSync(path.join(dir, 'screens', f));
  if (process.argv.includes('--png')) {
    const out = path.join(dir, 'preview');
    fs.mkdirSync(out, { recursive: true });
    await page.setViewportSize({ width: 794, height: 1123 });
    const count = await page.locator('section.page').count();
    for (let i = 0; i < count; i++) await page.locator('section.page').nth(i).screenshot({ path: path.join(out, `page-${String(i + 1).padStart(2, '0')}.png`) });
  }
  await browser.close();
  console.log('Wrote', htmlPath, 'and', pdfPath);
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
