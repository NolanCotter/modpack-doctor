# Modpack Doctor

Turn a Minecraft crash log into a plain-English next step.

Modpack Doctor is a browser-only, rule-based diagnostic tool for Fabric logs. It recognizes common failure families: missing or incompatible dependencies, mixin failures, Java-version mismatch, out-of-memory errors, missing classes, and binary incompatibilities.

## Run locally

```bash
npm install
npm run dev
```

No logs leave the browser. This first release uses transparent pattern matching; the exact matched log line is available with every diagnosis.

## Run on a server

Build the static site, then start the production preview server:

```bash
npm install
npm run build
npm run start
```

The server listens on all interfaces by default. For a production host, serve the generated `dist/` directory from any static web server or reverse proxy.

## CI

GitHub Actions builds the project and performs a server smoke test on Ubuntu, macOS, and Windows for every push and pull request.
