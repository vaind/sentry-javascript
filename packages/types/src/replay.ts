import { EventInterface } from './event';

export interface ReplayEvent extends EventInterface {
  type: 'replay_event';
  event_id: string;
  urls: string[];
  error_ids: string[];
  trace_ids: string[];
  replay_id: string;
  segment_id: number;
}

export type ReplayRecordingData = string | Uint8Array;
