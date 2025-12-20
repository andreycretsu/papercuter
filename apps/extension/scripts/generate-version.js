#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
  const gitDate = execSync('git log -1 --format=%cd --date=short').toString().trim();
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

  // Read semantic version from VERSION file
  const versionPath = path.join(__dirname, '..', 'VERSION');
  const version = fs.readFileSync(versionPath, 'utf8').trim();

  const versionInfo = {
    version,
    hash: gitHash,
    date: gitDate,
    branch: gitBranch,
    timestamp: new Date().toISOString(),
  };

  // Write to both root (for dev) and public (for build)
  const rootPath = path.join(__dirname, '..', 'version.json');
  const publicPath = path.join(__dirname, '..', 'public', 'version.json');

  fs.writeFileSync(rootPath, JSON.stringify(versionInfo, null, 2));
  fs.writeFileSync(publicPath, JSON.stringify(versionInfo, null, 2));

  console.log('✓ Generated version.json:', versionInfo);
} catch (error) {
  console.error('Failed to generate version info:', error.message);
  // Create a fallback version
  const versionPath = path.join(__dirname, '..', 'VERSION');
  const version = fs.existsSync(versionPath)
    ? fs.readFileSync(versionPath, 'utf8').trim()
    : '0.0.0';

  const fallback = {
    version,
    hash: 'unknown',
    date: new Date().toISOString().split('T')[0],
    branch: 'unknown',
    timestamp: new Date().toISOString(),
  };
  const rootPath = path.join(__dirname, '..', 'version.json');
  const publicPath = path.join(__dirname, '..', 'public', 'version.json');

  fs.writeFileSync(rootPath, JSON.stringify(fallback, null, 2));
  fs.writeFileSync(publicPath, JSON.stringify(fallback, null, 2));
}
