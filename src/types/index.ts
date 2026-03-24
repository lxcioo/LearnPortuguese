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

export interface GrammarSection {
  heading: string;
  explanation: string;
  examples?: string[]; // Optional: Eine Liste von Beispielen
}

export interface Unit {
  id: string;
  title: string;
  color: string;
  levels: Level[];
  grammarGuide?: GrammarSection[]; // NEU: Optionaler Grammatik-Teil
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

// --- NEU: Streak Tracking System ---
export interface StreakData {
  currentStreak: number;
  lastStreakDate: string;
  streakOnIceCount: number; // Anzahl der blauen Flammen (Aussetzer)
  history: Record<string, 'learned' | 'frozen'>; // Map von "YYYY-MM-DD" zu Status
}

export interface UserProfile {
  name: string;
  hasCompletedOnboarding: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any; // Ionicons Name
  isUnlocked: boolean;
}