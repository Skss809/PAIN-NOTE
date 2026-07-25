const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');

const oldFunc = `function SortableNote({ 
  note, 
  isDark, 
  setActiveNote, 
  deleteNote, 
  handleCopy, 
  copiedId, 
  formatDate 
}: SortableNoteProps) {`;

const newFunc = `const SortableNote: React.FC<SortableNoteProps> = ({ 
  note, 
  isDark, 
  setActiveNote, 
  deleteNote, 
  handleCopy, 
  copiedId, 
  formatDate 
}) => {`;

content = content.replace(oldFunc, newFunc);

fs.writeFileSync('src/components/Notepad.tsx', content);
