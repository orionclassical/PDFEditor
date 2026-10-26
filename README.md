# PDF Editor

A browser-based PDF editor built with React, TypeScript, Vite, PDF.js, and pdf-lib.

## Requirements

- Node.js 22.13+ or 24+
- npm

## Local development

```sh
npm ci
npm run dev
```

## Validation

```sh
npm run lint
npm run build
npm audit
```

The production build is written to `dist`.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Use the Vite framework preset, with `npm run build` as the build command and `dist` as the output directory. These settings are also recorded in `vercel.json`.
4. Deploy. No environment variables are currently required.

PDF loading, editing, and export run in the browser; this app does not upload the selected PDF to a server.
