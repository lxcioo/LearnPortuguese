const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// 2. Screens Ordner erstellen
const screensDir = path.join(srcDir, 'views', 'screens');
if (!fs.existsSync(screensDir)) {
  fs.mkdirSync(screensDir, { recursive: true });
  console.log(`Created ${screensDir}`);
}

// 3. Import-Pfade in allen Dateien aktualisieren
function updateImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      updateImports(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.json')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      const patterns = [
        { regex: /@\/src\/view\//g, replacement: '@/src/views/' },
        { regex: /@\/src\/model\//g, replacement: '@/src/models/' },
        { regex: /@\/src\/viewmodel\//g, replacement: '@/src/viewmodels/' },
        { regex: /([^a-zA-Z0-9])view\//g, replacement: '$1views/' },
        { regex: /([^a-zA-Z0-9])model\//g, replacement: '$1models/' },
        { regex: /([^a-zA-Z0-9])viewmodel\//g, replacement: '$1viewmodels/' }
      ];

      for (const { regex, replacement } of patterns) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  }
}

updateImports(srcDir);
console.log('Refactoring step 1.5 complete.');
