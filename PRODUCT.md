# MOUVRA

Russian-language product showroom and demonstrable ecommerce application for gaming mice, presented to prospective web-design clients. Never label the site as a portfolio. Reference compositions supplied by the user: sculptural products, large typography, generous spacing and presentation-like page progression. All factual data, imagery, 3D and prices must have official manufacturer provenance.

Audience: people choosing a gaming mouse and clients evaluating website craft. Main journey: discover → catalogue → inspect actual model → compare → save/cart → account.

Thirty source-backed models across twelve brands, with comparison covering every catalogue model. This is an expanding collection, not a claim to cover every mouse ever made. Preserve exact variants, polling receiver caveats, currencies and availability. Prices are snapshots, not a seller's quotation.

Features: home, catalogue search/filters/sort, detail pages with galleries and real GLB viewers with slow automatic rotation and pause controls, comparison up to four models with differences filter, selection guide, source index, login/register dialog, account profile/favourites/cart, saved demo orders. No real payment or fulfilment integration is configured; checkout explicitly saves a demonstration selection without charging.

Implementation choice: React/TypeScript with Vinext (Next-compatible routing) and Cloudflare D1. Password registration backed by PBKDF2, opaque HttpOnly sessions and server-side account data. Separate browser-local demo mode for client presentations; never store a password locally. Native reduced motion and keyboard support.
