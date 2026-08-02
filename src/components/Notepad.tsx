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
import { TodoListEditor } from './TodoListEditor';
import { AHTCalculator } from './AHTCalculator';
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
  ListTodo, Grid, AlignLeft, Type, Minus, Folder, FolderPlus, Menu, X as CloseIcon, MoreVertical,
  Calculator
} from 'lucide-react';
import { Note, Folder as FolderType } from '../types';
import defaultBg from '../assets/1784929805103.png';

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
  const { notes, preferences, loading, addNote, updateNote, deleteNote, updateBackgroundImage, updateTheme, reorderNotes, folders, addFolder, deleteFolder, moveNote } = useNotes();
  
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
  const [activeView, setActiveView] = useState<'notes' | 'aht'>('notes');

  const isGridView = activeNote ? !!activeNote.isGridView : false;

  const toggleGridView = () => {
    if (!activeNote) return;
    const nextIsGrid = !activeNote.isGridView;
    setActiveNote({ ...activeNote, isGridView: nextIsGrid });
    updateNote(activeNote.id, activeNote.title || '', activeNote.content, activeNote.templateType, activeNote.fontFamily, activeNote.fontSize, nextIsGrid);
  };
  const [bgInput, setBgInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>('root');
  const [newFolderName, setNewFolderName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDark = preferences?.theme === 'dark';
  let currentBg = preferences?.backgroundImage;
  console.log('DEBUG BG:', { currentBg, defaultBg, prefBg: preferences?.backgroundImage });
  // Fix legacy broken path if it was saved in Firestore
  if (currentBg && currentBg.includes('infinite-tsukoyomi.jpg')) {
    currentBg = defaultBg;
  }
  if (!currentBg || currentBg === 'none' || currentBg === 'default') {
    currentBg = defaultBg;
  }

  const getBgStyle = (bg: string) => {
    if (!bg) return 'none';
    if (bg.startsWith('url(')) return bg;
    return `url("${bg}")`;
  };

  const handleCreateNew = async (templateContent: string = '', templateType: string = 'Custom') => {
    setActiveView('notes');
    const title = 'Untitled Note';
    const noteId = await addNote(title, templateContent, templateType, 'font-mono', 14, false);
    if (noteId && selectedFolderId && selectedFolderId !== 'all' && selectedFolderId !== 'root') { await moveNote(noteId, selectedFolderId); }
    if (noteId && user) {
      setActiveNote({
        id: noteId,
        userId: user.uid,
        title,
        content: templateContent,
        templateType,
        fontFamily: 'font-mono',
        fontSize: 14,
        isGridView: false,
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
      const originalBase64 = event.target?.result as string;
      
      // If the original image is already small enough for Firestore (limit is ~1MB for the whole doc)
      // We check against ~1,000,000 chars of base64
      if (originalBase64.length < 1000000) {
        updateBackgroundImage(originalBase64).catch(err => {
          alert("Error saving image: " + err.message);
        });
        return;
      }

      // If it's too large, we need to compress it but keep quality as high as possible
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Don't shrink too much, try keeping up to 1920x1080
        const maxDim = 1920; 
        
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
          
          // Try high quality first
          let compressedBase64 = canvas.toDataURL('image/jpeg', 0.9);
          
          if (compressedBase64.length > 1000000) {
            // Still too large, try medium quality
            compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          }
          
          if (compressedBase64.length > 1000000) {
             // Still too large, try lower quality and resolution
             canvas.width = width * 0.7;
             canvas.height = height * 0.7;
             ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
             compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          }

          if (compressedBase64.length > 1000000) {
            alert("Image is still too large after compression. Please select a smaller file (under 700KB).");
            return;
          }
          
          updateBackgroundImage(compressedBase64).catch(err => {
            alert("Error saving image: " + err.message);
          });
        }
      };
      img.src = originalBase64;
    };
    reader.readAsDataURL(file);
  };

  const clearBg = () => {
    updateBackgroundImage('default');
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
    
    updateNote(activeNote.id, activeNote.title || '', newContent, activeNote.templateType, activeNote.fontFamily, activeNote.fontSize, activeNote.isGridView);
    
    // Set focus back to textarea and move cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + insertText.length, start + insertText.length);
      }
    }, 0);
  };


  const filteredNotes = notes.filter(n => {
    if (selectedFolderId === 'all' || selectedFolderId === null) return true;
    if (selectedFolderId === 'root') return !n.folderId;
    return n.folderId === selectedFolderId;
  });

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
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2 rounded-xl transition-all ${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`} 
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white text-black' : 'bg-neutral-900 text-white'}`}>
              <PenLine className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-serif tracking-tight font-semibold">Notepad</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNewMenu(!showNewMenu)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-neutral-100 hover:bg-neutral-200'}`}
              >
                <Plus className="w-4 h-4" /> New Note
              </button>
              {showNewMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)}></div>
                  <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl border z-50 transition-all origin-top-right ${isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-neutral-100'}`}>
                    <div className="p-2 space-y-1 relative z-50">
                      <button 
                        onClick={() => { handleCreateNew('', 'Custom'); setShowNewMenu(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left text-sm font-medium ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50 text-neutral-700'}`}
                      >
                        <Plus className={`w-4 h-4 ${isDark ? 'text-neutral-400' : 'text-neutral-400'}`} /> Blank Note
                      </button>
                      <div className={`h-px my-1 mx-2 ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`}></div>
                      {TEMPLATES.map(t => (
                        <button 
                          key={t.id}
                          onClick={() => { handleCreateNew(t.content, t.name); setShowNewMenu(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left text-sm font-medium ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50 text-neutral-700'}`}
                        >
                          <t.icon className={`w-4 h-4 ${isDark ? 'text-neutral-400' : 'text-neutral-400'}`} /> {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
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

                      {preferences?.backgroundImage && preferences.backgroundImage !== 'none' && preferences.backgroundImage !== 'default' && preferences.backgroundImage !== defaultBg && (
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 relative flex flex-row gap-6 items-start">
        
        {/* Sidebar */}
        {showSidebar && (
          <aside className={`w-64 flex-shrink-0 flex flex-col gap-4 rounded-3xl p-4 border shadow-sm transition-all ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/80 border-black/5'}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-neutral-400">Navigation</h2>
              <button onClick={() => setShowSidebar(false)} className={`p-1 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <button 
                onClick={() => { setActiveView('notes'); setSelectedFolderId('all'); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${activeView === 'notes' && (selectedFolderId === 'all' || selectedFolderId === null) ? (isDark ? 'bg-white/10 text-white font-medium' : 'bg-black/5 text-black font-medium') : (isDark ? 'hover:bg-white/5 text-neutral-300' : 'hover:bg-black/5 text-neutral-700')}`}
              >
                <AlignLeft className="w-4 h-4" /> All Notes
              </button>
              <button 
                onClick={() => { setActiveView('notes'); setSelectedFolderId('root'); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${activeView === 'notes' && selectedFolderId === 'root' ? (isDark ? 'bg-white/10 text-white font-medium' : 'bg-black/5 text-black font-medium') : (isDark ? 'hover:bg-white/5 text-neutral-300' : 'hover:bg-black/5 text-neutral-700')}`}
              >
                <Folder className="w-4 h-4" /> Root
              </button>
              
              <div className="my-2 h-px bg-current opacity-10"></div>
              
              {folders.map(folder => (
                <div key={folder.id} className="flex items-center group">
                  <button 
                    onClick={() => { setActiveView('notes'); setSelectedFolderId(folder.id); }}
                    className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-l-xl text-sm transition-colors ${activeView === 'notes' && selectedFolderId === folder.id ? (isDark ? 'bg-white/10 text-white font-medium' : 'bg-black/5 text-black font-medium') : (isDark ? 'hover:bg-white/5 text-neutral-300' : 'hover:bg-black/5 text-neutral-700')}`}
                  >
                    <Folder className="w-4 h-4" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); if (selectedFolderId === folder.id) setSelectedFolderId('all'); }}
                    className={`px-2 py-2 rounded-r-xl transition-colors opacity-0 group-hover:opacity-100 ${activeView === 'notes' && selectedFolderId === folder.id ? (isDark ? 'bg-white/10 text-red-400' : 'bg-black/5 text-red-500') : (isDark ? 'hover:bg-white/5 text-red-400' : 'hover:bg-black/5 text-red-500')}`}
                    title="Delete Folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (newFolderName.trim()) {
                  addFolder(newFolderName.trim());
                  setNewFolderName('');
                }
              }}
              className="mt-2 flex flex-col gap-2"
            >
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name..."
                className={`w-full px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-white/5 border-white/10 focus:border-white/20' : 'bg-black/5 border-black/5 focus:border-black/10'} border outline-none`}
              />
              <button 
                type="submit"
                disabled={!newFolderName.trim()}
                className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'} disabled:opacity-50`}
              >
                <FolderPlus className="w-4 h-4" /> Add Folder
              </button>
            </form>

            <div className="my-2 h-px bg-current opacity-10"></div>

            {/* Tools Section */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-1 mb-1">Tools & Utilities</span>
              <button
                onClick={() => { setActiveView('aht'); setActiveNote(null); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeView === 'aht'
                    ? 'bg-[#00E5FF]/20 text-[#00E5FF] font-semibold border border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : (isDark ? 'hover:bg-white/5 text-neutral-300' : 'hover:bg-black/5 text-neutral-700')
                }`}
              >
                <Calculator className="w-4 h-4 text-[#00E5FF]" />
                Calculate AHT
              </button>
            </div>

          </aside>
        )}

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 self-stretch gap-6">
        
        {activeView === 'aht' ? (
          <AHTCalculator isDark={isDark} />
        ) : activeNote ? (
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
                  onClick={toggleGridView}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}`}
                  title="Toggle Grid View"
                >
                  {isGridView ? <><AlignLeft className="w-4 h-4" /> <span className="hidden sm:inline">Text View</span></> : <><Grid className="w-4 h-4" /> <span className="hidden sm:inline">Grid View</span></>}
                </button>
                <div className="relative">
                <button 
                  onClick={() => setShowFontMenu(!showFontMenu)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}`}
                  title="Font Settings"
                >
                  <Type className="w-4 h-4" /> <span className="hidden sm:inline">Font</span>
                </button>
                {showFontMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFontMenu(false)}></div>
                    <div className={`absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl border z-50 p-2 transition-all origin-top-right ${isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-neutral-100'}`}>
                      <div className="relative z-50 space-y-2">
                        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Font Family</div>
                        <div className="grid grid-cols-1 gap-1">
                          {['font-mono', 'font-sans', 'font-serif'].map(f => (
                            <button 
                              key={f}
                              onClick={() => {
                                setActiveNote({ ...activeNote, fontFamily: f });
                                updateNote(activeNote.id, activeNote.title || '', activeNote.content, activeNote.templateType, f, activeNote.fontSize, activeNote.isGridView);
                              }}
                              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeNote.fontFamily === f ? (isDark ? 'bg-white/10' : 'bg-black/5') : (isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50')}`}
                            >
                              <span className={f}>{f === 'font-mono' ? 'Monospace' : f === 'font-sans' ? 'Sans Serif' : 'Serif'}</span>
                            </button>
                          ))}
                        </div>
                        <div className={`h-px my-2 ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`}></div>
                        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Size ({activeNote.fontSize || 14}px)</div>
                        <div className="flex items-center gap-2 px-2 pb-1">
                          <button 
                            onClick={() => {
                              const newSize = Math.max(10, (activeNote.fontSize || 14) - 1);
                              setActiveNote({ ...activeNote, fontSize: newSize });
                              updateNote(activeNote.id, activeNote.title || '', activeNote.content, activeNote.templateType, activeNote.fontFamily, newSize, activeNote.isGridView);
                            }}
                            className={`p-1.5 rounded-lg border transition-colors flex-1 flex justify-center ${isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              const newSize = Math.min(32, (activeNote.fontSize || 14) + 1);
                              setActiveNote({ ...activeNote, fontSize: newSize });
                              updateNote(activeNote.id, activeNote.title || '', activeNote.content, activeNote.templateType, activeNote.fontFamily, newSize, activeNote.isGridView);
                            }}
                            className={`p-1.5 rounded-lg border transition-colors flex-1 flex justify-center ${isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
                {activeNote.templateType !== 'Todo List' && (
                <button 
                  onClick={insertCheckbox}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'}`}
                  title="Insert Checkbox"
                >
                  <ListTodo className="w-4 h-4" /> <span className="hidden sm:inline">Add Checkbox</span>
                </button>
                )}
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
                  updateNote(activeNote.id, e.target.value, activeNote.content, activeNote.templateType, activeNote.fontFamily, activeNote.fontSize, activeNote.isGridView);
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
                                  <td 
                                    key={cIdx} 
                                    className="p-3 whitespace-pre-wrap relative group cursor-pointer"
                                    onDoubleClick={() => handleCopy(cell, `cell-${activeNote.id}-${rIdx}-${cIdx}`)}
                                    title="Double click to copy"
                                  >
                                    <div className={`transition-all ${copiedId === `cell-${activeNote.id}-${rIdx}-${cIdx}` ? 'opacity-50' : ''}`}>
                                      {cell}
                                    </div>
                                    {copiedId === `cell-${activeNote.id}-${rIdx}-${cIdx}` && (
                                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className={`px-2 py-1 rounded text-xs font-bold shadow-lg ${isDark ? 'bg-white text-black' : 'bg-neutral-900 text-white'}`}>Copied!</span>
                                      </span>
                                    )}
                                  </td>
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
                if (activeNote.templateType === 'Todo List' && !isGridView) {
                  return (
                    <TodoListEditor 
                      content={activeNote.content} 
                      onChange={(newContent) => {
                        setActiveNote({ ...activeNote, content: newContent });
                        updateNote(activeNote.id, activeNote.title || '', newContent, activeNote.templateType, activeNote.fontFamily, activeNote.fontSize, activeNote.isGridView);
                      }} 
                      isDark={isDark} 
                      fontFamily={activeNote.fontFamily}
                      fontSize={activeNote.fontSize}
                    />
                  );
                }
                return (
                  <textarea
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) => {
                      setActiveNote({ ...activeNote, content: e.target.value });
                      updateNote(activeNote.id, activeNote.title || '', e.target.value, activeNote.templateType, activeNote.fontFamily, activeNote.fontSize, activeNote.isGridView);
                    }}
                    className={`flex-1 w-full bg-transparent outline-none resize-none ${activeNote.fontFamily || 'font-mono'} leading-relaxed ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}
                    style={{ fontSize: `${activeNote.fontSize || 14}px` }}
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
                    items={filteredNotes.map(n => n.id)}
                    strategy={rectSortingStrategy}
                  >
                    {filteredNotes.map(note => (
                      <SortableNote 
                        key={note.id} 
                        note={note} 
                        isDark={isDark} 
                        setActiveNote={setActiveNote} 
                        deleteNote={deleteNote} 
                        handleCopy={handleCopy} 
                        copiedId={copiedId} 
                        formatDate={formatDate}
                        folders={folders}
                        moveNote={moveNote}
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
            )}
          </div>
        )}
        </div>
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
  folders: FolderType[];
  moveNote: (noteId: string, folderId: string | null) => Promise<void>;
}

const SortableNote: React.FC<SortableNoteProps> = ({ 
  note, 
  isDark, 
  setActiveNote, 
  deleteNote, 
  handleCopy, 
  copiedId, 
  formatDate,
  folders,
  moveNote
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
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
          <select 
            value={note.folderId || ''} 
            onClick={e => e.stopPropagation()} 
            onChange={e => { e.stopPropagation(); moveNote(note.id, e.target.value || null); }}
            className={`text-xs rounded p-1 max-w-[80px] outline-none cursor-pointer ${isDark ? 'bg-black/40 text-neutral-300' : 'bg-white/50 text-neutral-600'} border-none`}
          >
            <option value="">Root</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              deleteNote(note.id);
            }}
            className={`p-1.5 rounded-lg ${isDark ? 'text-neutral-500 hover:text-red-400 hover:bg-red-900/30' : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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
