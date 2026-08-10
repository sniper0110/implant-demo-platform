# Customer embed guide

## Snippet

```html
<div data-pycad-embed="emb_pycad_staging" data-layout="section"></div>
<script async src="https://implant-demo.pycad.co/embed/v1.js"></script>
```

- `data-pycad-embed` — public embed ID assigned by PYCAD
- `data-layout` — `section` or `full`

## Layout behavior

| Layout | Use case | Minimum height |
|--------|----------|----------------|
| `section` | Product page block | 520px |
| `full` | Dedicated demo page | 720px / viewport |

## Required CSP (if your site uses Content-Security-Policy)

Allow these origins:

- `https://implant-demo.pycad.co` — loader, iframe, assets
- `frame-src https://implant-demo.pycad.co`

No Google Fonts dependency is required.

## WordPress / Elementor

1. Add a **Custom HTML** block where the demo should appear.
2. Paste the snippet above.
3. Use template **Elementor Full Width** or **Header & Footer** for full-page demos.
4. Do not wrap the snippet in extra iframes.

## Staging test page on pycad.co

Internal validation page:

- URL: `https://pycad.co/resources/implant-demo-test/`
- Settings: draft first, Rank Math **noindex**, exclude from menus and sitemap
- Include both a section block and a full-height block on the same page

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank box | Confirm embed ID is active and domain is allowlisted |
| Clipped demo | Increase container height or switch to `full` layout |
| Mixed content | Embed host must be `https://` |
| Demo blocked in iframe | Customer origin must be in embed `frame-ancestors` policy |

## Open standalone demo

`https://implant-demo.pycad.co/e/emb_pycad_staging`
