const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');

const oldState = `  const [isGridView, setIsGridView] = useState(() => {
    const saved = localStorage.getItem('isGridView');
    return saved === 'true';
  });

  const toggleGridView = () => {
    setIsGridView(prev => {
      const next = !prev;
      localStorage.setItem('isGridView', next.toString());
      return next;
    });
  };`;

const newState = `  const [gridViews, setGridViews] = useState<Record<string, boolean>>(() => {
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

content = content.replace(oldState, newState);
fs.writeFileSync('src/components/Notepad.tsx', content);
