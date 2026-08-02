export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  templateType: string;
  createdAt: number;
  updatedAt: number;
  order?: number;
  folderId?: string;
  fontFamily?: string;
  fontSize?: number;
  isGridView?: boolean;
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
}

export interface UserPreferences {
  userId: string;
  backgroundImage?: string;
  theme?: 'light' | 'dark';
  updatedAt: number;
}
