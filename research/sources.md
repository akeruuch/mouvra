# AIMFORM — official product research

Observed 31 October 2026. Research scope: six named models, not every gaming mouse on the market. `mice.json` is the normalized dataset. Values that could not be verified in official material are `null`, never inferred from retailer listings. Prices retain the official currency and market; no conversion or invented local selling price is used.

## Verified models and official store prices

| Model and precise variant | Official observed price | Availability | Primary source |
| --- | ---: | --- | --- |
| Logitech G PRO X SUPERLIGHT 2 White | USD 159.99 | In stock in US store | [Product page](https://www.logitechg.com/en-us/shop/p/pro-x2-superlight-wireless-mouse) |
| Razer Viper V3 Pro White | USD 129.99; regular 159.99 | In stock in US store | [Product page](https://www.razer.com/gaming-mice/razer-viper-v3-pro) |
| Razer DeathAdder V3 Pro White, Classic Base, 1000 Hz | USD 79.99; regular 149.99 | Out of stock; displayed historical offer | [Product page](https://www.razer.com/gaming-mice/razer-deathadder-v3-pro) |
| ZOWIE U2, original model | Not published | Discontinued on Singapore page | [Product page](https://zowie.benq.com/en-sg/mouse/u2.html) |
| Pulsar X2 v2 Medium White | USD 99.95 | White unavailable; black in stock | [Product page](https://www.pulsar.gg/products/x2v2-gaming-mouse) |
| LAMZU Atlantis OG V2 Pro Polar White | USD 91.99 | Sold out | [Product page](https://lamzu.com/products/lamzu-atlantis-og-v2-pro-gaming-mouse) |

Razer prices, variant identities, and availability were inspected in the official page's serialized product state (`markDownPrice`, `price`, `stock`), not a search-result summary. Pulsar and LAMZU prices/currencies/availability were verified in official Shopify product variant state. Raw source captures are in `research/raw/` for audit, not required by the app.

## Technical sources and interpretation

- **Logitech:** [US product page](https://www.logitechg.com/en-us/shop/p/pro-x2-superlight-wireless-mouse), [official support specification](https://support.logi.com/hc/de-at/articles/15235304069783-Specification-G-PRO-X-Superlight-2-Lightspeed-Gaming-Mouse). Current marketing and support specify 44,000 DPI and 8000 Hz. A nested legacy page specification still says 32,000 DPI; the dataset uses updated current values and notes this. Battery claim is 95 h constant motion, with user/environment caveat; do not label it 95 h at 8000 Hz.
- **Razer Viper:** [technical specifications](https://mysupport.razer.com/app/answers/detail/a_id/14045/), [support FAQ](https://mysupport.razer.com/app/answers/detail/a_id/14044/), [official model comparison](https://www.razer.com/blog/razer-viper-line-which-one-is-right-for-you). White is 55 g; black is 54 g. The ordinary V3 Pro includes its 8000 Hz receiver. V3 Pro SE is a different package. 8000 Hz is wireless only.
- **Razer DeathAdder:** [Classic Base support and specifications](https://mysupport.razer.com/app/answers/detail/a_id/6125), [official guide](https://dl.razerzone.com/master-guides/RazerSynapse3/DEATHADDERV3PRO-00000182-en.pdf). White is 64 g; black is 63 g. Classic Base includes a 1000 Hz receiver; 8000 Hz requires the separate HyperPolling receiver. Do not conflate Classic Base with Smooth Touch 8000 Hz packages. The official white 3D model shows this actual mouse, not another model.
- **ZOWIE:** [original U2 page](https://zowie.benq.com/en-sg/mouse/u2.html), [manufacturer dimension diagram](https://image.benq.com/is/image/benqco/07-u2-measurement?fmt=png-alpha). Original U2 is 1000 Hz, sensor 3395, selectable DPI up to 3200. Table gives 60.3 g; FAQ and diagram round to 60 g. Diagram gives 124 × 65 × 38 mm; 58 mm is grip width, not maximum width. The US `/u2.html` address now redirects to U2-DW, so it must not be used as evidence for the original U2. Main switch part number was not verified; the optical scroll wheel is not evidence that the primary switches are optical.
- **Pulsar:** [official X2 v2 Medium page](https://www.pulsar.gg/products/x2v2-gaming-mouse). 53 ± 1 g, 120.4 × 63 × 38 mm. 1000 Hz included; 4000 Hz requires a separate dongle. Battery is up to 100 h ±10% at 1000 Hz, varying by environment. This is Medium, not Mini.
- **LAMZU:** [official resource index](https://lamzu.com/pages/resource), [OG V2 Pro specification PDF](https://cdn.shopify.com/s/files/1/0581/9675/4466/files/resource_OG_V2_PRO_specifications.pdf?v=1713866630), [model differences FAQ](https://lamzu.com/pages/q-a). PDF downloaded, text extracted and visually inspected. It states **57 ± 2 g**, 123 × 66 × 38 mm, 3395 sensor, 26,000 DPI, Huano transparent blue shell pink dot switches, 1000 Hz default and optional 4K. The often repeated 55 g value is not used. Battery duration was not specified in these official materials and remains null.

## Official images and 3D

`assets.json` records exact download URL, local public path, byte count, SHA-256 and validated format for every asset. Images are genuine manufacturer product renders; no product geometry, logo or appearance has been generated or altered.

Three real GLB 2.0 files were discovered in official product-page model viewers and downloaded:

| Model | Local path | Validation |
| --- | --- | --- |
| Logitech Superlight 2 White | `public/images/superlight-white.glb` | 9,233,256 bytes; 2 meshes; embedded resources |
| Razer DeathAdder V3 Pro White | `public/images/deathadder-white.glb` | 14,447,888 bytes; 35 meshes; embedded resources |
| ZOWIE U2 Black | `public/images/zowie-u2.glb` | 10,027,248 bytes; 29 meshes; embedded resources |

For Viper V3 Pro, Pulsar X2 v2 and LAMZU OG V2 Pro, no manufacturer 3D file was found in the checked product/resource pages. Use their official 2D renders. Do not reuse another model's 3D geometry. Logitech has three downloaded clean white views: top, right profile and bottom. Asset ownership remains with the respective manufacturers; the research does not assert brand affiliation.

## UI use

- Show prices as an official market reference, with currency, observed date and source link. They are not a promise of local stock, shipping, checkout or fulfillment.
- Preserve sold-out/discontinued badges; a saved-item/cart demonstration may still accept products but must not imply actual stock.
- Comparison should distinguish **included polling rate** and **maximum with optional receiver**. Battery comparison should show its polling conditions.
- If a null value is shown, use “Не указано производителем” or “Уточнить на официальном сайте”, not 0.
