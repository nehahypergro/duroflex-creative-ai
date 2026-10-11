# India print and outdoor proof workflow

Implemented 9 October 2026 for new Duroflex and Sleepyhead selections. This is shared production methodology, not brand knowledge or a printer's approval. No stock, ICC profile, printer or outdoor operator has been selected by the client. The client supplied India as the main production context.

Every newly selected print preset pins `proofWorkflowVersion: 1`. Completed print sets receive three downloads: the ordered RGB raster master with physical PDF boxes, a calibrated A4 proof packet, and a machine-readable preflight report. Missing faces prevent a complete master. Historical selections, packages, reviews, budgets and files retain their earlier workflow.

## Actual-size proof preparation

- The proof packet uses A4 sheets, metric crop coordinates and a vector 50 mm ruler on every page. Print with **Actual Size / 100%**, without Fit, Shrink or borderless expansion. Measure the line on paper; 49.5–50.5 mm is the Studio's scale-check tolerance, not a commercial trimming tolerance. Confirm both axes using the 100 mm square in the calibration kit.
- Artboards requiring at most 12 sheets per face receive complete 1:1 tiles with nominal 5 mm overlap. Pixel rounding preserves source detail and may slightly alter crop dimensions/overlap. The report records each actual physical crop size and its pixel rectangle.
- Larger faces receive a scaled overview and three explicitly labelled 1:1 samples. These are **partial coverage**. The complete artwork still needs an installed-size proof or complete tiled/production proof from the operator. The expected full tile count is recorded; a sample cannot establish whole-layout readability or clearance.
- An overview is labelled with its scale. Neither the overview nor calibration sample typography certifies the generated artwork's type size, colour or legibility. Examine essential wording and adjacent terms on the actual artwork at the actual distance, light/glare and available reading time.
- PDF creation is preparation only. The application does not infer that paper was printed, measured, assembled or physically inspected.

## Automatic preflight and recorded checks

Automatic checks bind master PDF bytes and proof source-image hashes, require all faces, decode trim/bleed boxes, and compare physical dimensions. New oversized PDF pages use `UserUnit: 10` to stay within the normal 200-inch coordinate limit; calculations account for that scale. The chosen operator must confirm RIP support. Resolution uses the lower source/export PPI at finished physical size; upsampling does not restore detail. An unknown source remains unverified, and an insufficient known export cap still fails.

The preflight uses the selected Studio PPI as a **provisional** target until the operator's target is recorded. A print vendor's small-format 300 dpi guidance is not a universal billboard requirement. Exact print size, substrate, viewing distance and RIP specifications control the job.

The evidence form requires a named printer/operator, exact template/specification reference, stock/substrate, finishing/mounting, finished-size PPI and file requirements. It also records measured calibration, full physical coverage, actual reading distance/time, observed readability, template/fold/hardware clearance, production colour/finish sample, observer and evidence reference. It is an attestation entered by the user, not an independently authenticated inspection. Record only checks actually performed.

Evidence is saved as a separate immutable report and indexed in the saved job. Master/proof hashes and the saved brand must match. Altered files or a revised proof require new evidence. Older records remain retained but do not display as current for a different file version. An evidence record does not overwrite the artwork review, mark a generated image ready, change learning memory or authorize manufacture.

Current masters contain RGB raster artwork. If the vendor requires CMYK, PDF/X, embedded vector text, imposition or a certified dieline, preflight stays blocked and that production file must be prepared in the appropriate prepress workflow. No arbitrary ICC profile is assigned merely because the job is in India. Press colour must be checked on the chosen stock/process, with the operator's colour requirements.

Statuses are `blocked` (at least one failed check), `checks-pending` (at least one unconfirmed check), and `recorded-checks-complete` (all available checks pass with supplied evidence). `productionReady` remains false: the Studio reports its checks and the operator retains the final release decision.

## India vendor guidance

Checked 9 October 2026. Vendor guidance applies to its specified products and does not replace the chosen printer/operator's exact template.

| Source | Application |
|---|---|
| [VistaPrint India product specifications](https://www.vistaprint.in/customer-care/help-centre/360052259431) | Use selected product dimensions, bleed/safe area, template and stock/finish options. |
| [VistaPrint India colour guidance](https://www.vistaprint.in/customer-care/help-centre/360060410851) | RGB-to-CMYK output may change colours; high-resolution source artwork and production samples matter. |
| [VistaPrint India postcard specifications](https://www.vistaprint.in/customer-care/help-centre/360059888112) | A6 examples have full bleed 151×108 mm, trim 148×105 mm and safe area 145×102 mm: this demonstrates why the Studio's default 3 mm bleed must not be treated as universal. |
| [PrintStop India artwork FAQ](https://www.printstop.co.in/faq.php) | Artwork above 300 dpi, supported production formats, bleed/trim/safe distinctions and held orders for artwork issues. |
| [Printo India standard posters](https://printopro.printo.in/standard-posters-1634/upload/) | Selected-product upload templates, full bleed/safe margins and 300 dpi guidance. |
| [Adobe large-document printing](https://helpx.adobe.com/acrobat/desktop/print-documents/set-up-and-print-pdfs/large-documents.html) | Poster tiling, scaling, overlap and labels; pre-tiled Studio A4 sheets print at 100%. |
| [Adobe ISO PDF reference](https://developer.adobe.com/document-services/docs/assets/35e4369068f86065372c18787171a17e/PDF_ISO_32000-1.pdf) | PDF physical units and large-page UserUnit mechanics. |
| [OAAA print production guidance](https://oaaa.org/wp-content/uploads/2022/09/Print-Production-Specifications3.pdf) | Supplemental US outdoor reference only. Indian operator controls production scale, seams, stock, resolution and installation. |

## Deliverables and verification

The six-page [calibration kit](../../output/pdf/india-print-production-calibration.pdf) includes the physical scale sheet, operator procedure, all 43 preset starting specifications and source references. Build it with the bundled Python runtime and `scripts/placements/build-india-production-kit.py`; it invokes `scripts/placements/production-presets.js` to derive the inventory directly from the current catalogue. `STUDIO_NODE_BINARY` can select a different bundled Node location.

Runtime packets are tested with synthetic artwork without paid generation. Automated checks and rendered PDF inspection verify file preparation. No physical print measurement, commercial colour sample or operator sign-off is claimed.
