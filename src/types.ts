export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  templateType: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferences {
  userId: string;
  backgroundImage?: string;
  theme?: 'light' | 'dark';
  updatedAt: number;
}
