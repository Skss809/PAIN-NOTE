const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');

content = content.replace("deleteNote: (id: string) => void;", "deleteNote: (id: string) => Promise<void>;");
content = content.replace("formatDate: (ts: number) => string;", "formatDate: (timestamp?: number) => string;");

fs.writeFileSync('src/components/Notepad.tsx', content);
