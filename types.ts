export interface Problem {
  problem: string;
  answer: string;
}

export interface HistoryEntry {
  id: string;
  problem: Problem;
  solutionImage: string; // base64 data URL
  feedback: string;
  timestamp: string;
}

export enum AppMode {
  Practice = 'practice',
  Recognition = 'recognition',
}
