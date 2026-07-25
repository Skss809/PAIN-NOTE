const fs = require('fs');
let content = fs.readFileSync('src/components/Notepad.tsx', 'utf-8');

// replace Dnd-kit core imports
content = content.replace("PointerSensor,", "PointerSensor, TouchSensor, MouseSensor,");

const oldSensors = `  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );`;

const newSensors = `  const sensors = useSensors(
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
  );`;

content = content.replace(oldSensors, newSensors);
fs.writeFileSync('src/components/Notepad.tsx', content);
