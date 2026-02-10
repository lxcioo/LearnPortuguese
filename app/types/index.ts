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