import { useEffect, useRef } from 'react';
import VoiceAudioRendererProps from '../../models/voiceAudioRendererProps.model';
import { useVoiceStore } from '../../context/VoiceContext';

export const VoiceAudioRenderer = ({ stream, muted, peerId }: VoiceAudioRendererProps & { peerId: string }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { userVolumes } = useVoiceStore();
    const volume = userVolumes.get(peerId) ?? 1;

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !stream) return;

        if (audio.srcObject !== stream) {
            audio.srcObject = stream;
        }
        
        audio.muted = false;
        audio.volume = muted ? 0 : volume;

        const playAudio = async () => {
            try {
                if (audio.paused) {
                    await audio.play();
                }
            } catch (err) {
                console.warn("Échec de la lecture audio automatique:", err);
            }
        };

        playAudio();
    }, [stream, muted, volume]);

    return (
        <audio 
            ref={audioRef} 
            autoPlay 
            playsInline 
            style={{ display: 'none' }} 
        />
    );
};
