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
  box: number; // 1-6 (Box 6 ist der "Monats-Status")
  nextReviewDate: string; // ISO Date String (jetzt mit Uhrzeit wichtig!)
  
  // Logic für Box 6 Aufstieg
  box5Streak: number; // Wie oft hintereinander Box 5 gewählt?

  // Stats
  mistakeCount: number;
  successCount: number;
  lastPracticed: string; // YYYY-MM-DD
  
  // Für "Heutige Fehler" Logik
  mistakesToday: number; 
  solvedToday: number;
}

export type VocabDatabase = Record<string, VocabEntry>;

export interface DailyStats {
  date: string;
  wordsLearned: number;
  mistakesMade: number;
}