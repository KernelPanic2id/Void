import { useEffect, useRef } from 'react';
import VoiceAudioRendererProps from '../../models/voiceAudioRendererProps.model';
import { useVoiceStore } from '../../context/VoiceContext';

export const VoiceAudioRenderer = ({ stream, muted, peerId }: VoiceAudioRendererProps & { peerId: string }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { userVolumes } = useVoiceStore();
    const volume = userVolumes.get(peerId) ?? 1;

    useEffect(() => {
        if (!audioRef.current) return;
        if (!stream) return;
        audioRef.current.srcObject = stream;
        audioRef.current.muted = false; // On veut entendre le son
        audioRef.current.volume = muted ? 0 : volume;
    }, [stream, muted, volume]);

    return (
        <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
    );
};
