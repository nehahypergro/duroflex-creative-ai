# Client creative direction v1 (25 Nov 2026)

Client feedback for Duroflex and Sleepyhead, relayed by Neha. New lean jobs pin `creativeDirectionVersion: 1`.
Earlier jobs keep what they had.

## Where it lives

Each brand has its own file: `output/creative-ai/brands/<brandId>/creative-direction.json`.

- The engine (`lib/creative-ai/lean/creative-direction.js`) is shared. A brand with no file gets nothing.
- The file is read only for its own brand. It is pinned on the job when the job is created, with its SHA-256, so later edits reach new jobs only.
- Real brand names the client used (Alo, Skims, Diesel, Lego) are kept only in the file's `notes`. Prompts describe them in words.

| | Duroflex | Sleepyhead |
|---|---|---|
| Creative freedom | Guided: close to the brand world | Expressive: bold and inventive; the brand's room advice is not binding |
| Rooms | Japandi, Scandinavian, earthy contemporary; natural light; one small pop | Dopamine-high Gen-Z; contrasting colours; pop art, toy sets, neon shapes; orange as an accent, not the walls |
| People | By range: Duropedic = fit and active; LiveIn / Energise / Natural Living = sustainable | Early 20s, expressive |
| Wardrobe | Clean, fitted athleisure, neutral and earthy tones, no logos | Streetwear drip meets comfort: playful loungewear, bold streetwear, caps and accessories, coloured hair |
| Limbo colours | Warm and earthy; a stronger pop when needed | Extremely bright, high-contrast pop colours with shapes that explain the layers |
| Named elements per room | 1–3 | 3–6 |
| Casting | Every person is Indian (women and men; children when a page shows a family) | Every person is Indian (young women and men; expressive styling never changes that) |
| Both | No light blue or light green backgrounds; about 30% breathing space; crisp texture | |

## Stage by stage

1. **Job creation** (`runtime/engine.js`). The brand file is pinned on the job, together with the product's range. The range is read from the words on the product's own saved website page, for example "Duropedic range", "Energise collection" or "Natural Living range".
2. **Before planning** (`runtime/lean-workflow.js` `productSpace`). One small reading of the official photos does three things:
   - works out the interior style of the website's rooms (style, architecture, materials, furniture, decor, lighting, colours, mood);
   - works out the website's studio (limbo) look;
   - marks the clearest patch of the product's surface texture.

   The reading is cached per brand, product and photo set, in the brand's `product-spaces/` folder. If it fails, the plan still goes ahead without it.
3. **Planning** (`runtime/lean-context.js` builds the input; `lean/planning.js` checks the plan).
   - Each page is either a room or a limbo shot. A feature, explainer, infographic, close-up or sale page is a limbo shot. A lifestyle page is a room. Otherwise the planner chooses.
   - The planner writes `scene` for each page: the type, the backdrop and the named elements.
   - The plan is refused, with the reason, if it has:
     - the wrong scene type for the page;
     - a light blue or light green backdrop;
     - too few or too many named elements;
     - a real brand, character or franchise name.
   - Preferences and advice that the file replaces are left out of the planner's input. So are recent palettes in an avoided colour.
4. **Image brief.** A CLIENT DIRECTION block covers the scene, colours, people and wardrobe, texture, breathing space and creative freedom. An enlarged close-up of the real texture is cropped from an exact product photo. Brand isolation (`textureMatches`) accepts only that exact crop.
5. **Image check.** The check asks four questions: background colours, the planned scene, breathing space and product texture. Each is a layout finding, so a clear miss gets the page's one redraw. "Did it deliver?" shows these under a Brand look row. Whether a design is fun enough is a matter of taste, so it is not checked; the named elements are how the fun gets in.

## Casting (added 25 Nov 2026)

Neha: "the models (people) need to be indian. not any other ethnicity". Each brand file has its own `cast` line. It reaches the planner (every person on every page), the image brief's PEOPLE line and a check, "People cast as briefed" (`people-casting`). A clear miss gets the page's one redraw. A face that is hidden or too small is "unable to verify", not a failure. Jobs pinned before this line was added keep their check.

## Replaced 22 Nov preferences

These preferences are turned off and kept in history. Earlier jobs keep their own snapshot.

- Duroflex wardrobe: `preference-c7ff3af2…`
- Sleepyhead wardrobe: `preference-f21d9199…`
- Sleepyhead room look: `preference-bf7b59c1…`

## Sleepyhead's "Scandinavian"

"Scandinavian" appears only in pin captions and hashtags on the client's Pinterest board, for example "Colorful Scandinavian Kitchen Ideas" and #scandinavianliving. It is not in the guide or in any rule.

The drift came from two other places:

- the board's advice to explore "quieter colour-aware alternatives" (`spatial-world`);
- the 22 Nov room-look rule, which asked for colour-blocked walls.

For new jobs, both are replaced by the Sleepyhead file. The board itself stays saved as the client's source.

## Cost

There is no new step per design:

- The check asks its four questions inside the call it already makes.
- Each drawing gets one more reference picture (the texture close-up).
- Casting is one more question in the same check.
- The photo reading runs once per product and is then reused.

## After the variety batch (25 Nov 2026)

Neha's local batch made 6 designs per brand. It showed four gaps. Neha said "Yes, all four"; new jobs pin each fix.

- **Variety memory** (`varietyVersion: 1`). Each brand remembers the scenes its recent designs used: room or backdrop, the named pieces and the outfits. The planner sees the brand's 8 most recent designs, from any product, and is asked to make the next one clearly different within the brand's direction. It writes each person's outfit in `scene.wardrobe`, and the image brief names that outfit. This is guidance only, with no pass/fail check. Each brand's memory stays in its own folder.
- **Duroflex's pop of colour.** Duroflex's file now names its "little pop": one small, clearly visible object in a richer accent colour. The planner writes it in `scene.pop` and the image brief asks for it. It is not checked, because taste is not pass/fail. Sleepyhead's file has no pop line, since expressive rooms already carry colour.
- **Backup planner room** (`backupRoomVersion: 1`). When the backup planner takes over, it gets 30,000 tokens of answer room instead of 12,500. Unused room costs nothing.
- **Layer stacks** (`layerStackVersion: 1`). When the product's construction picture is attached, the planner keeps the whole layer stack and its labels inside the canvas. A stack cut by an edge is redrawn narrower.

## Product name and editorial shoot (25 Nov 2026, evening)

The client sent two notes for both brands, and a set of reference pictures for Duroflex.

- **Product name.** Ad copy uses a short name with no variant: "Duropedic Airboost", not "Duropedic Airboost 6.8 Arctic Ice Mattress"; "Sofa Yolo", not "Sofa Yolo 3+2 Seater Set". The plan check refuses a model number (6.8), a colour name (Sesame Grey), a size or seat count, or the rest of the catalogue name after the short name. Marketplace, product-page, A+ and close-reading pages keep the listing name.
- **Editorial shoot.** Each brand's file says how its pictures are photographed, like a fashion editorial. Duroflex's is editorial realism on film. Sleepyhead's is a bold youth fashion story. The line goes into every image brief.
- **Duroflex models.** The client is particular that people look real, not AI-made: skin texture, pores, moles, laugh lines, stubble, natural hair and candid moments. Outfits follow what the picture is for: pyjamas or lounge sets for sleep, linen and knits at home, athleisure for fitness and Duropedic, tailoring for work, and sarees and kurtas for festive pictures. The rooms follow the references: limewash walls, sheer curtains, warm wood and stone, sculptural pieces, and one oxblood, olive or rust accent. The 29 pictures are kept locally in `work/duroflex-models-rooms-20261125/`. They are described in words and never sent to the image model.

