# Modpack Doctor

Turn a Minecraft crash log into a plain-English next step.

Modpack Doctor is a browser-only, rule-based diagnostic tool for Fabric logs. It recognizes common failure families: missing or incompatible dependencies, mixin failures, Java-version mismatch, out-of-memory errors, missing classes, and binary incompatibilities.

## Run locally

```bash
npm install
npm run dev
```

No logs leave the browser. This first release uses transparent pattern matching; the exact matched log line is available with every diagnosis.
