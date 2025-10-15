/**
 * Convert Images to WebP
 * 
 * Phase 4: Convert all PNG/JPG images to WebP for 25-35% size reduction.
 * Performance: Faster page loads, better Lighthouse scores.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');
const QUALITY = 85; // WebP quality (0-100)

/**
 * Convert single image to WebP
 */
async function convertToWebP(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .webp({ quality: QUALITY })
      .toFile(outputPath);
    
    const inputStats = fs.statSync(inputPath);
    const outputStats = fs.statSync(outputPath);
    const savings = ((inputStats.size - outputStats.size) / inputStats.size) * 100;
    
    console.log(`✅ ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    console.log(`   ${(inputStats.size / 1024).toFixed(1)}KB → ${(outputStats.size / 1024).toFixed(1)}KB (${savings.toFixed(1)}% smaller)`);
    
    return { success: true, savings };
  } catch (error) {
    console.error(`❌ Failed to convert ${inputPath}:`, error.message);
    return { success: false, savings: 0 };
  }
}

/**
 * Find all images in directory recursively
 */
function findImages(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findImages(filePath, fileList);
    } else if (/\.(png|jpg|jpeg)$/i.test(file)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Main conversion function
 */
async function convertAllImages() {
  console.log('🖼️  Converting images to WebP...\n');
  
  const images = findImages(PUBLIC_DIR);
  console.log(`Found ${images.length} images to convert\n`);
  
  let totalSavings = 0;
  let successCount = 0;
  
  for (const imagePath of images) {
    const ext = path.extname(imagePath);
    const outputPath = imagePath.replace(ext, '.webp');
    
    // Skip if WebP already exists
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  ${path.basename(imagePath)} - WebP already exists`);
      continue;
    }
    
    const result = await convertToWebP(imagePath, outputPath);
    
    if (result.success) {
      totalSavings += result.savings;
      successCount++;
    }
  }
  
  console.log(`\n✅ Conversion complete!`);
  console.log(`   ${successCount}/${images.length} images converted`);
  console.log(`   Average size reduction: ${(totalSavings / successCount).toFixed(1)}%`);
  console.log(`\n💡 Update your code to use .webp extensions!`);
}

// Run if called directly
if (require.main === module) {
  convertAllImages().catch(console.error);
}

module.exports = { convertToWebP, findImages, convertAllImages };

