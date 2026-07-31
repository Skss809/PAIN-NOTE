import React, { useRef, useEffect } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TodoItem {
  id: string;
  checked: boolean;
  text: string;
}

interface TodoListEditorProps {
  content: string;
  onChange: (content: string) => void;
  isDark: boolean;
  fontFamily?: string;
  fontSize?: number;
}

const parseContent = (content: string): TodoItem[] => {
  const lines = content.split('\n');
  return lines.map((line, index) => {
    let checked = false;
    let text = line;
    if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      checked = true;
      text = line.substring(6);
    } else if (line.startsWith('- [ ] ')) {
      text = line.substring(6);
    }
    return {
      id: `item-${index}-${Date.now()}`, // simple id
      checked,
      text
    };
  }).filter(item => item.text.trim() !== '' || lines.length === 1);
};

const serializeContent = (items: TodoItem[]): string => {
  return items.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n');
};

export const TodoListEditor: React.FC<TodoListEditorProps> = ({ content, onChange, isDark, fontFamily, fontSize }) => {
  const itemsRef = useRef<TodoItem[]>([]);
  
  // Initialize items only once if we don't want cursor jumps, but we need to keep them synced.
  // Actually, standard controlled component approach works if we map carefully.
  const [items, setItems] = React.useState<TodoItem[]>(() => parseContent(content));

  // Sync from props if external changes happen
  useEffect(() => {
    if (serializeContent(items) !== content) {
      setItems(parseContent(content));
    }
  }, [content]);

  const updateItems = (newItems: TodoItem[]) => {
    setItems(newItems);
    onChange(serializeContent(newItems));
  };

  const toggleCheck = (index: number) => {
    const newItems = [...items];
    newItems[index].checked = !newItems[index].checked;
    updateItems(newItems);
  };

  const updateText = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index].text = text;
    updateItems(newItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newItems = [...items];
      newItems.splice(index + 1, 0, { id: `item-${Date.now()}`, checked: false, text: '' });
      updateItems(newItems);
      // Focus next input is tricky without refs. We'll just rely on standard state for now
    } else if (e.key === 'Backspace' && items[index].text === '' && items.length > 1) {
      e.preventDefault();
      const newItems = [...items];
      newItems.splice(index, 1);
      updateItems(newItems);
    }
  };
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      updateItems(newItems);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-2 overflow-auto pb-8">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableTodoItem 
              key={item.id} 
              item={item} 
              isDark={isDark} 
              onToggle={() => toggleCheck(index)} 
              onChange={(val) => updateText(index, val)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onDelete={() => {
                const newItems = [...items];
                newItems.splice(index, 1);
                updateItems(newItems);
              }}
              fontFamily={fontFamily}
              fontSize={fontSize}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button 
        onClick={() => {
          const newItems = [...items, { id: `item-${Date.now()}`, checked: false, text: '' }];
          updateItems(newItems);
        }}
        className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium self-start transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'}`}
      >
        <Plus className="w-4 h-4" /> Add Item
      </button>
    </div>
  );
};

interface SortableTodoItemProps {
  item: TodoItem;
  isDark: boolean;
  onToggle: () => void;
  onChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onDelete: () => void;
  fontFamily?: string;
  fontSize?: number;
}

const SortableTodoItem: React.FC<SortableTodoItemProps> = ({ item, isDark, onToggle, onChange, onKeyDown, onDelete, fontFamily, fontSize }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-3 p-2 rounded-xl group transition-colors ${isDragging ? (isDark ? 'bg-neutral-800 shadow-xl' : 'bg-white shadow-xl') : (isDark ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className={`cursor-grab active:cursor-grabbing p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-neutral-500 hover:text-white' : 'text-neutral-400 hover:text-black'}`}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      <button 
        onClick={onToggle}
        className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${item.checked ? (isDark ? 'bg-white border-white text-black' : 'bg-neutral-900 border-neutral-900 text-white') : (isDark ? 'border-neutral-600 hover:border-neutral-400' : 'border-neutral-300 hover:border-neutral-500')}`}
      >
        {item.checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>
      
      <input 
        type="text" 
        value={item.text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`flex-1 bg-transparent outline-none ${item.checked ? 'line-through opacity-50' : ''} ${fontFamily || 'font-mono'} ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}
        style={{ fontSize: `${fontSize || 14}px` }}
        placeholder="Todo item..."
      />
      
      <button 
        onClick={onDelete}
        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-neutral-500 hover:text-red-400 hover:bg-red-900/30' : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
