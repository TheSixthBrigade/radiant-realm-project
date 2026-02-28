const fs = require('fs');
const content = fs.readFileSync('src/components/RoadmapPage.tsx', 'utf8');
const lines = content.split('\n');
console.log('Lines:', lines.length);
