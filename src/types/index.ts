export interface Exercise {
  id: string;
  type: string;
  question: string;
  correctAnswer: string;
  alternativeAnswers?: string[];
  audioText?: string;
  options?: string[];
  correctAnswerIndex?: number;
  optionsLanguage?: string;
  gender?: 'm' | 'f';
}

export interface Level {
  id: string;
  title: string;
  exercises: Exercise[];
}

export interface Unit {
  id: string;
  title: string;
  color: string;
  levels: Level[];
}

export interface Course {
  id: string;
  title: string;
  units: Unit[];
}

// --- Tracking Strukturen ---

export interface VocabEntry {
  exerciseId: string;
  exerciseRef: Exercise;
  
  // Leitner Status
  box: number; // 0=Neu/Unbekannt, 1-5=Leitner Boxen
  nextReviewDate: string; // ISO Date String (YYYY-MM-DD)
  
  // Stats
  mistakeCount: number;
  successCount: number;
  lastPracticed: string; // ISO Date String
  
  // Für "Heutige Fehler" Logik
  mistakesToday: number; 
  solvedToday: number; // Wie oft heute richtig gelöst?
}

export type VocabDatabase = Record<string, VocabEntry>;

export interface DailyStats {
  date: string;
  wordsLearned: number; // Box > 0 oder heute 3x gelöst
  mistakesMade: number;
}