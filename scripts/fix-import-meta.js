const fs = require('fs');
const path = require('path');
const files = [
  'node_modules/@supabase/supabase-js/dist/module/index.js',
  'node_modules/@supabase/auth-js/dist/module/index.js'
];
files.forEach(file => {
  const p = path.join(process.cwd(), file);
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/import\.meta/g, '({url:""})');
    fs.writeFileSync(p, c);
    console.log('Fixed:', file);
  }
});
