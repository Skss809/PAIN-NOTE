const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');

if (!content.includes('import { parseToGrid }')) {
  content = content.replace("import { useNotes } from '../hooks/useNotes';", "import { useNotes } from '../hooks/useNotes';\nimport { parseToGrid } from '../lib/gridParser';");
  
  // Add icon
  content = content.replace("ListTodo", "ListTodo, Grid, AlignLeft");
}

const notepadInitOld = `  const { user, logout } = useAuth();
  const { notes, preferences, loading, addNote, updateNote, deleteNote, updateBackgroundImage, updateTheme, reorderNotes } = useNotes();`;
  
const notepadInitNew = `  const { user, logout } = useAuth();
  const { notes, preferences, loading, addNote, updateNote, deleteNote, updateBackgroundImage, updateTheme, reorderNotes } = useNotes();
  const [isGridView, setIsGridView] = useState(false);`;

content = content.replace(notepadInitOld, notepadInitNew);

const checkboxBtnOld = `                <button 
                  onClick={insertCheckbox}
                  className={\`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors \${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}\`}
                  title="Insert Checkbox"
                >
                  <ListTodo className="w-4 h-4" /> <span className="hidden sm:inline">Add Checkbox</span>
                </button>`;

const checkboxBtnNew = `                <button 
                  onClick={() => setIsGridView(!isGridView)}
                  className={\`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors \${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}\`}
                  title="Toggle Grid View"
                >
                  {isGridView ? <><AlignLeft className="w-4 h-4" /> <span className="hidden sm:inline">Text View</span></> : <><Grid className="w-4 h-4" /> <span className="hidden sm:inline">Grid View</span></>}
                </button>
                <button 
                  onClick={insertCheckbox}
                  className={\`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors \${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}\`}
                  title="Insert Checkbox"
                >
                  <ListTodo className="w-4 h-4" /> <span className="hidden sm:inline">Add Checkbox</span>
                </button>`;

content = content.replace(checkboxBtnOld, checkboxBtnNew);

const textareaOld = `              <textarea
                ref={textareaRef}
                value={activeNote.content}
                onChange={(e) => {
                  setActiveNote({ ...activeNote, content: e.target.value });
                  updateNote(activeNote.id, activeNote.title || '', e.target.value, activeNote.templateType);
                }}
                className={\`flex-1 w-full bg-transparent outline-none resize-none font-mono text-sm leading-relaxed \${isDark ? 'text-neutral-200' : 'text-neutral-800'}\`}
                placeholder="Start typing..."
              />`;

const textareaNew = `              {(() => {
                if (isGridView) {
                  const gridData = parseToGrid(activeNote.content);
                  if (gridData.layout === 'grid') {
                    return (
                      <div className="flex-1 w-full overflow-auto mt-4">
                        <table className={\`w-full text-left border-collapse \${isDark ? 'text-neutral-200' : 'text-neutral-800'}\`}>
                          <thead>
                            <tr>
                              {gridData.columns?.map((col, idx) => (
                                <th key={idx} className={\`p-3 border-b-2 font-semibold \${isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-neutral-200 bg-neutral-100/50'}\`}>
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {gridData.rows?.map((row, rIdx) => (
                              <tr key={rIdx} className={\`border-b \${isDark ? 'border-neutral-800 hover:bg-neutral-800/30' : 'border-neutral-100 hover:bg-neutral-50'}\`}>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-3 whitespace-pre-wrap">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  } else {
                    return (
                      <div className={\`flex-1 w-full flex items-center justify-center italic \${isDark ? 'text-neutral-500' : 'text-neutral-400'}\`}>
                        Text format is not structured enough for Grid View.
                      </div>
                    );
                  }
                }
                return (
                  <textarea
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) => {
                      setActiveNote({ ...activeNote, content: e.target.value });
                      updateNote(activeNote.id, activeNote.title || '', e.target.value, activeNote.templateType);
                    }}
                    className={\`flex-1 w-full bg-transparent outline-none resize-none font-mono text-sm leading-relaxed \${isDark ? 'text-neutral-200' : 'text-neutral-800'}\`}
                    placeholder="Start typing..."
                  />
                );
              })()}`;

content = content.replace(textareaOld, textareaNew);

fs.writeFileSync('src/components/Notepad.tsx', content);
