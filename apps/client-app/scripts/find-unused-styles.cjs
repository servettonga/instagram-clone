#!/usr/bin/env node

/**
 * Find potentially unused CSS classes in SCSS modules
 * Usage: node scripts/find-unused-styles.js
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Find all SCSS module files
const scssFiles = glob.sync('**/*.module.scss', {
  cwd: process.cwd(),
  ignore: ['node_modules/**', 'dist/**', '.next/**']
});

// Find all TSX/TS files
const tsxFiles = glob.sync('**/*.{tsx,ts}', {
  cwd: process.cwd(),
  ignore: ['node_modules/**', 'dist/**', '.next/**', '**/*.d.ts']
});

// Read all TSX content
const tsxContent = tsxFiles.map(file => {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}).join('\n');

console.log('\n🔍 Finding unused SCSS classes...\n');

let totalUnused = 0;

scssFiles.forEach(scssFile => {
  const scssPath = path.join(process.cwd(), scssFile);
  const scssContent = fs.readFileSync(scssPath, 'utf8');
  
  // Extract class names from SCSS (simple regex, may have false positives)
  const classRegex = /\.([a-zA-Z_][\w-]*)\s*\{/g;
  const classes = new Set();
  let match;
  
  while ((match = classRegex.exec(scssContent)) !== null) {
    classes.add(match[1]);
  }
  
  // Check which classes are used
  const unusedClasses = [];
  
  classes.forEach(className => {
    // Check if class is used in TSX with various patterns
    const patterns = [
      new RegExp(`styles\\.${className}`, 'g'),
      new RegExp(`'${className}'`, 'g'),
      new RegExp(`"${className}"`, 'g'),
      new RegExp(`className=['"\`].*${className}`, 'g'),
    ];
    
    const isUsed = patterns.some(pattern => pattern.test(tsxContent));
    
    if (!isUsed) {
      unusedClasses.push(className);
    }
  });
  
  if (unusedClasses.length > 0) {
    console.log(`📄 ${scssFile}`);
    unusedClasses.forEach(cls => {
      console.log(`   ❌ .${cls}`);
    });
    console.log('');
    totalUnused += unusedClasses.length;
  }
});

console.log(`\n✨ Found ${totalUnused} potentially unused classes\n`);
console.log('Note: This may include false positives for:');
console.log('  • Dynamic class names');
console.log('  • Classes used in other files');
console.log('  • Pseudo-classes and nested selectors\n');

console.log('💡 To verify and clean up, review each file manually or use:');
console.log('   • Search for the class name in your editor');
console.log('   • Check git history to see if it was recently used\n');
