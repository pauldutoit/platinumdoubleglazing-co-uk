---
city: "Manchester"
citySlug: "manchester"
intent: "Emergency Repair"
intentSlug: "emergency-repair"
region: "North West England"
indexable: false
metaTitle: "Emergency Repair in Manchester | Example Local Services"
metaDescription: "Emergency repair in Manchester - fast callouts, free quotes. Not yet indexed: this page is new and gated until it proves engagement."
generatedAt: "2026-08-26"
generatedBy: "manual"
---

## This page illustrates the indexation gate

This city is set to `indexable: false` in `src/data/cities.json`. The page still builds,
is still linked internally (so it still accumulates PageRank and gets crawled), but ships
with `<meta name="robots" content="noindex,follow">` and is excluded from `sitemap.xml`.

Flip `indexable` to `true` for this city once the page has real traffic/engagement history
and you're ready to let Google index it.
