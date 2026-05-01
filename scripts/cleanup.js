const fs = require('fs');
const path = require('path');

const filesToDelete = [
  // '.env.local', // DO NOT delete env locally
  'pharmacademy'
];

filesToDelete.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    try {
      if (fs.lstatSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      console.log(`Deleted: ${file}`);
    } catch (err) {
      console.error(`Error deleting ${file}: ${err.message}`);
    }
  } else {
    console.log(`Not found: ${file}`);
  }
});
