export type AppMode = 'CALCULATOR' | 'VAULT';

export interface VaultItem {
  id: string;
  dataUrl: string; // Base64 image
  timestamp: number;
  name: string;
}

export enum CalculatorAction {
  ADD = '+',
  SUBTRACT = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  EQUALS = '=',
  CLEAR = 'C',
  DELETE = 'DEL',
  DECIMAL = '.',
  PERCENT = '%',
  NUMBER = 'NUM',
  AI_EXPLAIN = 'AI'
}
