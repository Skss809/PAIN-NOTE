import React, { useState, FormEvent, ChangeEvent, useRef } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor, TouchSensor, MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useAuth } from '../hooks/useAuth';
import { useNotes } from '../hooks/useNotes';
import { parseToGrid } from '../lib/gridParser';
import { 
  LogOut, 
  Image as ImageIcon, 
  Plus, 
  Copy, 
  Trash2,
  FileText,
  CheckSquare,
  Code,
  LayoutTemplate,
  PenLine,
  X,
  ChevronLeft,
  Settings,
  Moon,
  Sun,
  ListTodo, Grid, AlignLeft
} from 'lucide-react';
import { Note } from '../types';
import defaultBg from '../assets/infinite-tsukoyomi.jpg';

const TEMPLATES = [
  {
    id: 'meeting',
    name: 'Meeting Notes',
    icon: FileText,
    content: `# Meeting: [Topic]\n\n**Date:** [Date]\n**Attendees:** [Names]\n\n## Agenda\n- \n\n## Discussion\n- \n\n## Action Items\n- [ ] `
  },
  {
    id: 'todo',
    name: 'To-Do List',
    icon: CheckSquare,
    content: `# To-Do List\n\n## High Priority\n- [ ] \n- [ ] \n\n## Low Priority\n- [ ] \n- [ ] `
  },
  {
    id: 'code',
    name: 'Code Snippet',
    icon: Code,
    content: `# Snippet: [Name]\n\n**Description:** \n\n\`\`\`javascript\n// Your code here\n\n\`\`\``
  },
  {
    id: 'checklist',
    name: 'Checklist',
    icon: ListTodo,
    content: `# Checklist\n\n- [ ] Item 1\n- [ ] Item 2\n- [ ] Item 3`
  }
];

export function Notepad() {
  const { user, logout } = useAuth();
  const { notes, preferences, loading, addNote, updateNote, deleteNote, updateBackgroundImage, updateTheme, reorderNotes } = useNotes();
  const [isGridView, setIsGridView] = useState(false);
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
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
      
      const newNotes = arrayMove(notes, oldIndex, newIndex) as Note[];
      reorderNotes(newNotes);
    }
  };

  
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [bgInput, setBgInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDark = preferences?.theme === 'dark';
  let currentBg = preferences?.backgroundImage;
  // Fix legacy broken path if it was saved in Firestore
  if (currentBg && currentBg.includes('infinite-tsukoyomi.jpg')) {
    currentBg = defaultBg;
  }
  if (!currentBg || currentBg === 'none') {
    currentBg = defaultBg;
  }

  const getBgStyle = (bg: string) => {
    if (!bg) return 'none';
    if (bg.startsWith('url(')) return bg;
    return `url("${bg}")`;
  };

  const handleCreateNew = async (templateContent: string = '', templateType: string = 'Custom') => {
    const title = 'Untitled Note';
    const noteId = await addNote(title, templateContent, templateType);
    if (noteId && user) {
      setActiveNote({
        id: noteId,
        userId: user.uid,
        title,
        content: templateContent,
        templateType,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBgSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateBackgroundImage(bgInput.trim())
      .then(() => {
        setBgInput('');
      })
      .catch(err => {
        alert("Error saving URL: " + err.message);
      });
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so the same file can be selected again
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // Reduced to 800px to ensure it fits in Firestore 1MB limit
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4); // 40% quality
          
          if (compressedBase64.length > 1000000) {
            alert("Image is too large. Please select a smaller or simpler image.");
            return;
          }
          
          updateBackgroundImage(compressedBase64).catch(err => {
            alert("Error saving image: " + err.message);
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const clearBg = () => {
    updateBackgroundImage('');
  };

  const insertCheckbox = () => {
    if (!activeNote || !textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = activeNote.content;
    
    const beforeText = currentContent.substring(0, start);
    const afterText = currentContent.substring(end);
    
    const isNewLine = start === 0 || currentContent[start - 1] === '\n';
    const insertText = isNewLine ? '- [ ] ' : '\n- [ ] ';
    
    const newContent = beforeText + insertText + afterText;
    
    updateNote(activeNote.id, activeNote.title || '', newContent, activeNote.templateType);
    
    // Set focus back to textarea and move cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + insertText.length, start + insertText.length);
      }
    }, 0);
  };

  if (loading) {
    return <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-neutral-900 text-neutral-400' : 'bg-neutral-50 text-neutral-400'}`}><div className="animate-pulse font-medium">Loading workspace...</div></div>;
  }

  // Format date safely
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown date';
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div 
      className={`min-h-screen transition-all duration-500 ease-in-out bg-cover bg-center bg-no-repeat bg-fixed flex flex-col ${isDark ? 'bg-neutral-900 text-neutral-100' : 'bg-neutral-100 text-neutral-900'}`}
      style={{ backgroundImage: getBgStyle(currentBg) }}
    >
      {/* Top Navigation */}
      <header className={`backdrop-blur-xl border-b shadow-sm sticky top-0 z-30 ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/90 border-white/20'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white text-black' : 'bg-neutral-900 text-white'}`}>
              <PenLine className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-serif tracking-tight font-semibold">Notepad</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-neutral-100 hover:bg-neutral-200'}`}>
                <Plus className="w-4 h-4" /> New Note
              </button>
              <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right z-50 ${isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-neutral-100'}`}>
                <div className="p-2 space-y-1">
                  <button 
                    onClick={() => handleCreateNew('', 'Custom')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left text-sm font-medium ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50 text-neutral-700'}`}
                  >
                    <Plus className={`w-4 h-4 ${isDark ? 'text-neutral-400' : 'text-neutral-400'}`} /> Blank Note
                  </button>
                  <div className={`h-px my-1 mx-2 ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`}></div>
                  {TEMPLATES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => handleCreateNew(t.content, t.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left text-sm font-medium ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50 text-neutral-700'}`}
                    >
                      <t.icon className={`w-4 h-4 ${isDark ? 'text-neutral-400' : 'text-neutral-400'}`} /> {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl transition-all ${isDark ? 'text-neutral-300 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {showSettings && (
                <div className={`absolute right-0 top-full mt-2 w-72 rounded-xl shadow-xl border overflow-hidden z-50 ${isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-neutral-100 text-neutral-800'}`}>
                  <div className={`p-4 border-b ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`}>
                    <h3 className="text-sm font-semibold mb-3">Settings</h3>
                    
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium">Theme</span>
                      <div className={`flex items-center p-1 rounded-lg ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                        <button 
                          onClick={() => updateTheme('light')}
                          className={`p-1.5 rounded-md transition-colors ${!isDark ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-200'}`}
                        >
                          <Sun className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => updateTheme('dark')}
                          className={`p-1.5 rounded-md transition-colors ${isDark ? 'bg-neutral-700 shadow-sm text-white' : 'text-neutral-400 hover:text-neutral-600'}`}
                        >
                          <Moon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Background Settings */}
                    <div className="space-y-3">
                      <span className="text-sm font-medium">Background Image</span>
                      <div className={`relative border-2 border-dashed rounded-lg p-3 text-center transition-colors ${isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Upload an image"
                        />
                        <ImageIcon className={`w-4 h-4 mx-auto mb-1 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
                        <p className={`text-[10px] font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>Upload image</p>
                      </div>
                      
                      <form onSubmit={handleBgSubmit} className="flex items-center gap-2">
                        <input 
                          type="url" 
                          value={bgInput}
                          onChange={(e) => setBgInput(e.target.value)}
                          placeholder="Image URL..."
                          className={`flex-1 px-3 py-1.5 text-xs border rounded-lg focus:ring-0 outline-none transition-colors ${isDark ? 'bg-neutral-800 border-neutral-700 focus:border-neutral-500 text-white placeholder-neutral-500' : 'bg-white border-neutral-200 focus:border-neutral-400 text-neutral-900'}`}
                        />
                        <button type="submit" className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors ${isDark ? 'bg-white text-neutral-900 hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-800'}`}>Set</button>
                      </form>

                      {preferences?.backgroundImage && preferences.backgroundImage !== 'none' && preferences.backgroundImage !== defaultBg && (
                        <button type="button" onClick={clearBg} className="w-full mt-1 py-1.5 px-3 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors border border-red-100">
                          Revert to Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button onClick={logout} className={`p-2 rounded-xl transition-all ${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`} title="Sign out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 relative flex flex-col">
        
        {/* Detail View / Active Note */}
        {activeNote ? (
          <div className={`flex-1 w-full backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/95 border-white/40'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-100 bg-white/50'}`}>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveNote(null)}
                  className={`flex items-center gap-1 p-2 -ml-2 rounded-xl transition-all font-medium text-sm ${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
                >
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                  {activeNote.templateType}
                </span>
                <span className={`text-xs font-medium hidden sm:inline-block ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Last edited {formatDate(activeNote.updatedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsGridView(!isGridView)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}`}
                  title="Toggle Grid View"
                >
                  {isGridView ? <><AlignLeft className="w-4 h-4" /> <span className="hidden sm:inline">Text View</span></> : <><Grid className="w-4 h-4" /> <span className="hidden sm:inline">Grid View</span></>}
                </button>
                <button 
                  onClick={insertCheckbox}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}`}
                  title="Insert Checkbox"
                >
                  <ListTodo className="w-4 h-4" /> <span className="hidden sm:inline">Add Checkbox</span>
                </button>
                <button 
                  onClick={() => handleCopy(activeNote.content, activeNote.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}`}
                >
                  {copiedId === activeNote.id ? (
                    <><CheckSquare className="w-4 h-4 text-green-500" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy</>
                  )}
                </button>
                <button 
                  onClick={() => {
                    deleteNote(activeNote.id);
                    setActiveNote(null);
                  }}
                  className={`p-2 rounded-xl transition-all ${isDark ? 'text-neutral-500 hover:text-red-400 hover:bg-red-900/30' : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'}`}
                  title="Delete Note"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 w-full flex flex-col p-8 bg-transparent">
              <input
                type="text"
                value={activeNote.title || ''}
                onChange={(e) => {
                  setActiveNote({ ...activeNote, title: e.target.value });
                  updateNote(activeNote.id, e.target.value, activeNote.content, activeNote.templateType);
                }}
                className={`w-full bg-transparent outline-none font-serif text-3xl font-bold mb-4 placeholder:opacity-50 ${isDark ? 'text-white placeholder:text-neutral-500' : 'text-neutral-900 placeholder:text-neutral-400'}`}
                placeholder="Note Title"
              />
              {(() => {
                if (isGridView) {
                  const gridData = parseToGrid(activeNote.content);
                  if (gridData.layout === 'grid') {
                    return (
                      <div className="flex-1 w-full overflow-auto mt-4">
                        <table className={`w-full text-left border-collapse ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                          <thead>
                            <tr>
                              {gridData.columns?.map((col, idx) => (
                                <th key={idx} className={`p-3 border-b-2 font-semibold ${isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-neutral-200 bg-neutral-100/50'}`}>
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {gridData.rows?.map((row, rIdx) => (
                              <tr key={rIdx} className={`border-b ${isDark ? 'border-neutral-800 hover:bg-neutral-800/30' : 'border-neutral-100 hover:bg-neutral-50'}`}>
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
                      <div className={`flex-1 w-full flex items-center justify-center italic ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
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
                    className={`flex-1 w-full bg-transparent outline-none resize-none font-mono text-sm leading-relaxed ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}
                    placeholder="Start typing..."
                  />
                );
              })()}
            </div>
          </div>
        ) : (
          /* Grid View of Notes */
          <div className="animate-in fade-in duration-300 w-full">
            {notes.length === 0 ? (
              <div className="text-center py-20">
                <div className={`w-24 h-24 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border ${isDark ? 'bg-black/50 border-white/10' : 'bg-white/50 border-white/40'}`}>
                  <LayoutTemplate className={`w-10 h-10 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
                </div>
                <h2 className={`text-2xl font-serif font-semibold mb-3 drop-shadow-sm ${isDark ? 'text-white' : 'text-neutral-800'}`}>No notes yet</h2>
                <p className={`max-w-sm mx-auto drop-shadow-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>Create your first note using the "New Note" button above.</p>
              </div>
            ) : (
              <DndContext
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
              </DndContext>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

interface SortableNoteProps {
  note: Note;
  isDark: boolean;
  setActiveNote: (note: Note) => void;
  deleteNote: (id: string) => Promise<void>;
  handleCopy: (content: string, id: string) => void;
  copiedId: string | null;
  formatDate: (timestamp?: number) => string;
}

const SortableNote: React.FC<SortableNoteProps> = ({ 
  note, 
  isDark, 
  setActiveNote, 
  deleteNote, 
  handleCopy, 
  copiedId, 
  formatDate 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const title = note.title || 'Untitled Note';
  const preview = note.content.substring(0, 120);

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setActiveNote(note)}
      className={`group backdrop-blur-md border hover:shadow-xl hover:-translate-y-1 rounded-2xl p-5 cursor-pointer transition-all duration-300 flex flex-col h-64 ${isDark ? 'bg-black/60 border-white/10 hover:border-neutral-500' : 'bg-white/80 border-white/40 hover:border-neutral-300'} ${isDragging ? 'shadow-2xl scale-105' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${isDark ? 'bg-white/10 text-neutral-300' : 'bg-neutral-900/5 text-neutral-700'}`}>
          {note.templateType}
        </span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteNote(note.id);
          }}
          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${isDark ? 'text-neutral-500 hover:text-red-400 hover:bg-red-900/30' : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <h3 className={`font-semibold text-lg mb-2 line-clamp-2 leading-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
        {title}
      </h3>
      
      <p className={`text-sm line-clamp-4 flex-1 whitespace-pre-wrap font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
        {preview || <span className="italic opacity-50">Empty note</span>}
      </p>
      
      <div className={`mt-4 pt-4 border-t flex items-center justify-between ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`}>
        <span className={`text-xs font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          {formatDate(note.updatedAt)}
        </span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleCopy(note.content, note.id);
          }}
          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
        >
          {copiedId === note.id ? <CheckSquare className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
