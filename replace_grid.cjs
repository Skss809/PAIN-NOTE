const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');

// Also inject sensors and dragEnd handler at the beginning of Notepad component
const notepadComponentStart = `export function Notepad() {`;
const notepadInit = `export function Notepad() {
  const { user, logout } = useAuth();
  const { notes, preferences, loading, addNote, updateNote, deleteNote, updateBackgroundImage, updateTheme, reorderNotes } = useNotes();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id && over) {
      const oldIndex = notes.findIndex((note) => note.id === active.id);
      const newIndex = notes.findIndex((note) => note.id === over.id);
      
      const newNotes = arrayMove(notes, oldIndex, newIndex);
      reorderNotes(newNotes);
    }
  };
`;

content = content.replace("export function Notepad() {", notepadInit);

// Remove duplicate destructurings if they exist
content = content.replace("  const { user, logout } = useAuth();\n  const { notes, preferences, loading, addNote, updateNote, deleteNote, updateBackgroundImage, updateTheme } = useNotes();\n", "");

const gridStart = `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">`;
const gridOldContent = `              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {notes.map(note => {
                  const title = note.title || 'Untitled Note';
                  const preview = note.content.substring(0, 120);
                  
                  return (
                    <div 
                      key={note.id}
                      onClick={() => setActiveNote(note)}
                      className={\`group backdrop-blur-md border hover:shadow-xl hover:-translate-y-1 rounded-2xl p-5 cursor-pointer transition-all duration-300 flex flex-col h-64 \${isDark ? 'bg-black/60 border-white/10 hover:border-neutral-500' : 'bg-white/80 border-white/40 hover:border-neutral-300'}\`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className={\`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md \${isDark ? 'bg-white/10 text-neutral-300' : 'bg-neutral-900/5 text-neutral-700'}\`}>
                          {note.templateType}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                          className={\`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all \${isDark ? 'text-neutral-500 hover:text-red-400 hover:bg-red-900/30' : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'}\`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <h3 className={\`font-semibold text-lg mb-2 line-clamp-2 leading-tight \${isDark ? 'text-white' : 'text-neutral-900'}\`}>
                        {title}
                      </h3>
                      
                      <p className={\`text-sm line-clamp-4 flex-1 whitespace-pre-wrap font-mono \${isDark ? 'text-neutral-400' : 'text-neutral-500'}\`}>
                        {preview || <span className="italic opacity-50">Empty note</span>}
                      </p>
                      
                      <div className={\`mt-4 pt-4 border-t flex items-center justify-between \${isDark ? 'border-neutral-800' : 'border-neutral-100'}\`}>
                        <span className={\`text-xs font-medium \${isDark ? 'text-neutral-500' : 'text-neutral-400'}\`}>
                          {formatDate(note.updatedAt)}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(note.content, note.id);
                          }}
                          className={\`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all \${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}\`}
                        >
                          {copiedId === note.id ? <CheckSquare className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>`;

const newGridContent = `              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <SortableContext 
                    items={notes.map(n => n.id)}
                    strategy={rectSortingStrategy}
                  >
                    {notes.map(note => (
                      <SortableNote 
                        key={note.id}
                        note={note}
                        isDark={isDark}
                        setActiveNote={setActiveNote}
                        deleteNote={deleteNote}
                        handleCopy={handleCopy}
                        copiedId={copiedId}
                        formatDate={formatDate}
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>`;

content = content.replace(gridOldContent, newGridContent);

fs.writeFileSync('src/components/Notepad.tsx', content);
