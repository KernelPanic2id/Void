import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import VoicePeer from './voicePeer.model';
import ChatMessage from '../chat/chatMessage.model';

export default interface UseSfuConnectionProps {
  sendSignal: (payload: any) => Promise<void>;
  localStreamRef: MutableRefObject<MediaStream | null>;
  userIdRef: MutableRefObject<string>;
  usernameRef: MutableRefObject<string>;
  addToast: (message: string, type: 'join' | 'leave' | 'info') => void;
  setParticipants: Dispatch<SetStateAction<VoicePeer[]>>;
  setChannelStartedAt: Dispatch<SetStateAction<number | undefined>>;
  setRemoteStreams: Dispatch<SetStateAction<Map<string, MediaStream>>>;
  setRemoteVideoStreams: Dispatch<SetStateAction<Map<string, MediaStream>>>;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setBandwidthStats: Dispatch<SetStateAction<Map<string, number>>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

