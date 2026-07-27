const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');

const targetOld = `  const [gridViews, setGridViews] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('gridViews');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const isGridView = activeNote ? !!gridViews[activeNote.id] : false;

  const toggleGridView = () => {
    if (!activeNote) return;
    setGridViews(prev => {
      const next = { ...prev, [activeNote.id]: !prev[activeNote.id] };
      localStorage.setItem('gridViews', JSON.stringify(next));
      return next;
    });
  };`;

const targetNew = `  const [gridViews, setGridViews] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('gridViews');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });`;

content = content.replace(targetOld, targetNew);

const insertTarget = `  const [activeNote, setActiveNote] = useState<Note | null>(null);`;
const insertNew = `  const [activeNote, setActiveNote] = useState<Note | null>(null);

  const isGridView = activeNote ? !!gridViews[activeNote.id] : false;

  const toggleGridView = () => {
    if (!activeNote) return;
    setGridViews(prev => {
      const next = { ...prev, [activeNote.id]: !prev[activeNote.id] };
      localStorage.setItem('gridViews', JSON.stringify(next));
      return next;
    });
  };`;

content = content.replace(insertTarget, insertNew);

fs.writeFileSync('src/components/Notepad.tsx', content);
