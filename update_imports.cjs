const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');
const dndImports = `
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
`;
content = content.replace("import { useState, FormEvent, ChangeEvent, useRef } from 'react';", "import { useState, FormEvent, ChangeEvent, useRef } from 'react';" + dndImports);
fs.writeFileSync('src/components/Notepad.tsx', content);
