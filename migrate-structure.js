const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
                        path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  // 1. Move database out of backend
  if (fs.existsSync('./backend/database')) {
    copyRecursiveSync('./backend/database', './database');
    console.log('Moved backend/database to ./database');
  }

  // 2. Erase backend
  if (fs.existsSync('./backend')) {
    fs.rmSync('./backend', { recursive: true, force: true });
    console.log('Removed old backend/ directory');
  }

  // 3. Move frontend out to root
  if (fs.existsSync('./frontend')) {
    copyRecursiveSync('./frontend', './');
    console.log('Extracted frontend/ files to root');
    
    // 4. Erase frontend directory
    fs.rmSync('./frontend', { recursive: true, force: true });
    console.log('Removed old frontend/ directory');
  }

  // 5. Clean up node_modules to ensure a fresh install
  if (fs.existsSync('./node_modules')) {
     fs.rmSync('./node_modules', { recursive: true, force: true });
     console.log('Removed root node_modules for fresh reinstall');
  }

  console.log('Restructure complete! Please run `npm install`.');
} catch (error) {
  console.error('Error during restructure:', error);
}
