const fs = require('fs');
const path = require('path');

// Files to update
const routeFiles = [
  'test.js',
  'llm.js',
  'genesys.js',
  'flows.js'
];

// Path to routes directory
const routesDir = path.join(__dirname, 'routes');

// Process each file
routeFiles.forEach(file => {
  const filePath = path.join(routesDir, file);
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the import statement
  content = content.replace(
    "const { verifyToken } = require('./auth');",
    "// Authentication is now handled by sessionMiddleware in server.js"
  );
  
  // Replace verifyToken middleware in routes
  content = content.replace(
    /router\.(get|post|put|delete)\(['"](.+?)['"]\s*,\s*verifyToken\s*,/g,
    (match, method, route) => {
      return `router.${method}('${route}',`;
    }
  );
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`Updated ${file}`);
});

console.log('All route files updated successfully!');
