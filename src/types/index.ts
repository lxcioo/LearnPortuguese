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

// --- NEU: Tracking Strukturen für Turbo Spaced Repetition ---

export type ConfidenceLevel = 'none' | 'low' | 'medium' | 'high' | 'perfect';

export interface MistakeHistoryItem {
  date: string; // ISO String
  result: 'correct' | 'wrong';
  confidence?: ConfidenceLevel;
}

export interface VocabEntry {
  exerciseId: string;
  exerciseRef: Exercise; // Referenz für direkten Zugriff
  
  // Lern-Status
  nextReviewDate: string; // ISO String (inkl. Uhrzeit!)
  intervalMinutes: number; // Aktuelles Intervall in Minuten
  
  // Mastery Logik
  perfectStreak: number; // Wie oft hintereinander "Perfekt"?
  isMastered: boolean;   // True wenn 3x Perfekt -> wird ausgeblendet

  // Statistik
  mistakeCount: number;
  successCount: number;
  history: MistakeHistoryItem[];
}

export type VocabDatabase = Record<string, VocabEntry>;