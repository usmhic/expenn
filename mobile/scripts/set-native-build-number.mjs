#!/usr/bin/env node
// Patches app.json's android.versionCode / ios.buildNumber to a CI-supplied build
// number immediately before `expo prebuild`. Run this against a checked-out copy in
// CI only — the workflow discards the change afterward (`git checkout -- app.json`)
// so the committed app.json never carries a specific run's build number.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const buildNumber = process.argv[2] ?? process.env.GITHUB_RUN_NUMBER;
if (!buildNumber || Number.isNaN(Number(buildNumber))) {
  console.error("Usage: set-native-build-number.mjs <numeric build number>");
  console.error("(or set GITHUB_RUN_NUMBER)");
  process.exit(1);
}

const appJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "app.json");
const config = JSON.parse(readFileSync(appJsonPath, "utf8"));

config.expo.android ??= {};
config.expo.ios ??= {};
config.expo.android.versionCode = Number(buildNumber);
config.expo.ios.buildNumber = String(buildNumber);

writeFileSync(appJsonPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Set android.versionCode / ios.buildNumber to ${buildNumber} in ${appJsonPath}`);
