const fs = require('fs');
let content = fs.readFileSync('src/hooks/useNotes.ts', 'utf-8');

content = content.replace("getDoc", "getDoc,\n  writeBatch");

const oldReorder = `  const reorderNotes = async (reorderedNotes: Note[]) => {
    if (!user) return;
    
    // Optimistically update local state if needed (onSnapshot might handle this but doing it fast is good)
    // Actually, onSnapshot will fire when we update Firestore.
    // Assign order values (length - index to maintain descending sort)
    const total = reorderedNotes.length;
    
    // Create a batch update or just sequential updates
    // Since Firebase Web SDK 9 we can use writeBatch but sequential updateDoc is fine for small numbers
    try {
      await Promise.all(reorderedNotes.map(async (note, index) => {
        const order = total - index;
        if (note.order !== order) {
          await updateDoc(doc(db, 'notes', note.id), {
            order,
            updatedAt: Date.now()
          });
        }
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, \`notes\`);
    }
  };`;

const newReorder = `  const reorderNotes = async (reorderedNotes: Note[]) => {
    if (!user) return;
    
    // Optimistically update local state so it doesn't shuffle during sync
    setNotes(reorderedNotes);
    
    const batch = writeBatch(db);
    const total = reorderedNotes.length;
    let hasChanges = false;
    
    reorderedNotes.forEach((note, index) => {
      const order = total - index;
      if (note.order !== order) {
        hasChanges = true;
        batch.update(doc(db, 'notes', note.id), { order });
      }
    });
    
    if (!hasChanges) return;
    
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, \`notes\`);
    }
  };`;

content = content.replace(oldReorder, newReorder);
fs.writeFileSync('src/hooks/useNotes.ts', content);
