const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');

content = content.replace("const newNotes = arrayMove(notes, oldIndex, newIndex);", "const newNotes = arrayMove(notes, oldIndex, newIndex) as Note[];");

fs.writeFileSync('src/components/Notepad.tsx', content);
