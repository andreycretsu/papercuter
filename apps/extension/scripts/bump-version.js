#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionPath = path.join(__dirname, '..', 'VERSION');
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');

// Read current version
const currentVersion = fs.readFileSync(versionPath, 'utf8').trim();
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Increment patch version
const newVersion = `${major}.${minor}.${patch + 1}`;

// Update VERSION file
fs.writeFileSync(versionPath, newVersion);

// Update CHANGELOG
const date = new Date().toISOString().split('T')[0];
const changelogEntry = `
## [${newVersion}] - ${date}

### Changed
- Auto-deployment build

`;

const changelog = fs.readFileSync(changelogPath, 'utf8');
const lines = changelog.split('\n');

// Find where to insert (after the version format section)
const insertIndex = lines.findIndex(line => line.startsWith('## ['));
if (insertIndex !== -1) {
  lines.splice(insertIndex, 0, changelogEntry);
  fs.writeFileSync(changelogPath, lines.join('\n'));
}

console.log(`✓ Version bumped: ${currentVersion} → ${newVersion}`);
