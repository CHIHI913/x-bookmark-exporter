export type MessageType =
  | 'BOOKMARKS_RECEIVED'
  | 'START_CAPTURE'
  | 'STOP_CAPTURE'
  | 'CAPTURE_STARTED'
  | 'CAPTURE_PROGRESS'
  | 'CAPTURE_COMPLETED'
  | 'GET_CAPTURE_STATUS'
  | 'GET_BOOKMARKS'
  | 'EXPORT'
  | 'CLEAR_DATA';

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface CaptureOptions {
  mode: 'all' | 'count' | 'period';
  count?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface CaptureStatus {
  isCapturing: boolean;
  count: number;
  oldestDate: string | null;
  options: CaptureOptions | null;
}
