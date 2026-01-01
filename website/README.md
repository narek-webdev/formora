# Formora Documentation Website

This folder contains the **Formora** documentation site built with **Docusaurus**.

- GitHub: https://github.com/narek-webdev/formora
- npm: https://www.npmjs.com/package/formora

## Requirements

- Node.js (LTS recommended)
- npm / yarn / pnpm

## Install

From the `website/` directory:

```bash
npm install
```

> If you prefer Yarn:
>
> ```bash
> yarn
> ```

## Local development

```bash
npm start
```

This starts the dev server and opens the site in your browser.

## Build (production)

```bash
npm run build
```

## Serve the production build locally

```bash
npm run serve
```

## Common issues

### Build fails with missing sidebar

If you see an error like `Can't find any sidebar with id ...`, make sure `docusaurus.config.ts` references the correct sidebar id from `sidebars.ts` (in this repo it is `docs`).

## Folder structure

- `docs/` – documentation pages (MDX)
- `src/pages/` – custom pages (homepage, playground, etc.)
- `src/css/custom.css` – global theme overrides
- `static/` – static assets (logo, images)

## Notes

The main Formora package source code lives in the repository root. This `website/` folder is only for documentation.
