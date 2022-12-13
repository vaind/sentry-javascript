import { ReplayEnvelope, ReplayEvent, ReplayRecordingData } from '@sentry/types';
import { createEnvelope } from '@sentry/utils';

import { REPLAY_SDK_INFO } from '../constants';

export function createReplayEnvelope(
  replayId: string,
  replayEvent: ReplayEvent,
  recordingData: ReplayRecordingData,
): ReplayEnvelope {
  return createEnvelope<ReplayEnvelope>(
    {
      event_id: replayId,
      sent_at: new Date().toISOString(),
      sdk: REPLAY_SDK_INFO,
    },
    [
      [{ type: 'replay_event' }, replayEvent],
      [
        {
          type: 'replay_recording',
          length: recordingData.length,
        },
        recordingData,
      ],
    ],
  );
}
