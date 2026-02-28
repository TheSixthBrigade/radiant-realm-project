const fs = require('fs');
const raw = fs.readFileSync('src/components/RoadmapPage.tsx', 'utf8');
const lines = raw.split('\n');
const before = lines.slice(0, 882).join('\n');
const after = lines.slice(1326).join('\n');
