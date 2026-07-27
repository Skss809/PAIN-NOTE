const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');

content = content.replace(
  "const [isGridView, setIsGridView] = useState(false);",
  `const [isGridView, setIsGridView] = useState(() => {
    const saved = localStorage.getItem('isGridView');
    return saved === 'true';
  });

  const toggleGridView = () => {
    setIsGridView(prev => {
      const next = !prev;
      localStorage.setItem('isGridView', next.toString());
      return next;
    });
  };`
);

content = content.replace(
  "onClick={() => setIsGridView(!isGridView)}",
  "onClick={toggleGridView}"
);

fs.writeFileSync('src/components/Notepad.tsx', content);
