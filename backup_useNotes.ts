import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Note, UserPreferences } from '../types';
import { useAuth } from './useAuth';

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const notesRef = collection(db, 'notes');
    const q = query(notesRef, where('userId', '==', user.uid));
    
    const unsubNotes = onSnapshot(q, (snapshot) => {
      const fetchedNotes: Note[] = [];
      snapshot.forEach((doc) => {
        fetchedNotes.push({ id: doc.id, ...doc.data() } as Note);
      });
      // Sort by order descending, then creation time descending
      fetchedNotes.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return b.order - a.order; // Descending order
        }
        // Notes without order are newly created, so they should appear at the top
        if (a.order === undefined && b.order !== undefined) return -1;
        if (a.order !== undefined && b.order === undefined) return 1;
        
        return b.createdAt - a.createdAt;
      });
      setNotes(fetchedNotes);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
      setLoading(false);
    });

    const prefRef = doc(db, 'user_preferences', user.uid);
    const unsubPref = onSnapshot(prefRef, (docSnap) => {
      if (docSnap.exists()) {
        setPreferences(docSnap.data() as UserPreferences);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `user_preferences/${user.uid}`);
    });

    return () => {
      unsubNotes();
      unsubPref();
    };
  }, [user]);

  const addNote = async (title: string, content: string, templateType: string = 'Custom') => {
    if (!user) return null;
    const noteId = Date.now().toString() + Math.floor(Math.random() * 1000);
    const newNote: Omit<Note, 'id'> = {
      userId: user.uid,
      title,
      content,
      templateType,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    try {
      await setDoc(doc(db, 'notes', noteId), newNote);
      return noteId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `notes/${noteId}`);
      return null;
    }
  };

  const updateNote = async (noteId: string, title: string, content: string, templateType: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'notes', noteId), {
        title,
        content,
        templateType,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'notes', noteId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notes/${noteId}`);
    }
  };

  const updateBackgroundImage = async (url: string) => {
    if (!user) return;
    const prefRef = doc(db, 'user_preferences', user.uid);
    try {
      const snap = await getDoc(prefRef);
      if (snap.exists()) {
        await updateDoc(prefRef, {
          backgroundImage: url,
          updatedAt: Date.now()
        });
      } else {
        await setDoc(prefRef, {
          userId: user.uid,
          backgroundImage: url,
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `user_preferences/${user.uid}`);
      throw error;
    }
  };

  const updateTheme = async (theme: 'light' | 'dark') => {
    if (!user) return;
    const prefRef = doc(db, 'user_preferences', user.uid);
    try {
      const snap = await getDoc(prefRef);
      if (snap.exists()) {
        await updateDoc(prefRef, {
          theme,
          updatedAt: Date.now()
        });
      } else {
        await setDoc(prefRef, {
          userId: user.uid,
          theme,
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `user_preferences/${user.uid}`);
    }
  };

  const reorderNotes = async (reorderedNotes: Note[]) => {
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
      handleFirestoreError(error, OperationType.UPDATE, `notes`);
    }
  };

  return { 
    notes, 
    preferences, 
    loading, 
    addNote, 
    updateNote, 
    deleteNote, 
    updateBackgroundImage,
    updateTheme,
    reorderNotes
  };
}
