/**
 * Script to generate og-image.png from og-image-generator.html
 * 
 * Prerequisites:
 * npm install --save-dev puppeteer
 * 
 * Usage:
 * node scripts/generate-og-image.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generateOGImage() {
  const htmlPath = path.join(__dirname, '../public/og-image-generator.html');
  const outputPath = path.join(__dirname, '../public/og-image.png');

  if (!fs.existsSync(htmlPath)) {
    console.error('Error: og-image-generator.html not found at', htmlPath);
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport to exact size we want (1200x630 is standard for social sharing)
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 2, // For high DPI/retina quality
    });

    console.log('Loading HTML...');
    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'networkidle0',
    });

    // Wait a bit for fonts to load
    await page.waitForTimeout(1000);

    console.log('Generating screenshot...');
    await page.screenshot({
      path: outputPath,
      type: 'png',
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: 1200,
        height: 630,
      },
    });

    console.log(`✅ Success! OG image generated at: ${outputPath}`);
  } catch (error) {
    console.error('Error generating image:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generateOGImage();



