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

// --- NEU: Strukturen für Fehler-Tracking & Leitner ---

export interface MistakeHistoryItem {
  date: string; // ISO Date String
  result: 'correct' | 'wrong';
}

export interface MistakeEntry {
  exerciseId: string;
  exerciseRef: Exercise; // Kopie der Übung für direkten Zugriff
  leitnerBox: number; // 0 = Neu/Falsch, 1-5 = Boxen
  nextReviewDate: string; // ISO Date String (wann ist sie wieder fällig?)
  mistakeCount: number; // Absolute Anzahl Fehler
  successCount: number; // Absolute Anzahl Erfolge
  history: MistakeHistoryItem[]; // Historie für Diagramme
}

export type MistakeDatabase = Record<string, MistakeEntry>;