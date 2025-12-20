#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function packageExtension() {
  try {
    console.log('[Package Extension] Starting...');

    const extensionBuildPath = path.join(
      __dirname,
      '..',
      '..',
      'extension',
      '.output',
      'chrome-mv3'
    );

    const outputDir = path.join(__dirname, '..', 'public');
    const outputPath = path.join(outputDir, 'papercuts-extension.zip');

    // Check if extension build exists
    if (!fs.existsSync(extensionBuildPath)) {
      console.warn('[Package Extension] Extension build not found at:', extensionBuildPath);
      console.warn('[Package Extension] Skipping packaging. Build extension first with: npm run build:ext');
      return;
    }

    // Ensure public directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create zip archive
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.pipe(output);
    archive.directory(extensionBuildPath, false);
    await archive.finalize();

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
    });

    const stats = fs.statSync(outputPath);
    console.log('[Package Extension] ✓ Created extension package:', outputPath);
    console.log('[Package Extension] ✓ Size:', (stats.size / 1024).toFixed(2), 'KB');
  } catch (error) {
    console.error('[Package Extension] Error:', error);
    process.exit(1);
  }
}

packageExtension();
