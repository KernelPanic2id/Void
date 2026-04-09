import { MutableRefObject } from 'react';

export default interface UseVoiceSettingsProps {
  noiseGateNodeRef: MutableRefObject<AudioWorkletNode | null>;
}

