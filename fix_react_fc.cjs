const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');

content = content.replace("const SortableNote: React.FC<SortableNoteProps> = ({ ", "import React from 'react';\nconst SortableNote: React.FC<SortableNoteProps> = ({ ");

fs.writeFileSync('src/components/Notepad.tsx', content);
