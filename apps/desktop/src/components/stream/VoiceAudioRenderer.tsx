import { useEffect, useRef } from 'react';

interface Props {
    stream: MediaStream;
    muted: boolean;
}

export const VoiceAudioRenderer = ({ stream, muted }: Props) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioRef.current) {
            return;
        }
        audioRef.current.srcObject = stream;
        audioRef.current.muted = muted;
    }, [stream, muted]);

    return <audio ref={audioRef} autoPlay playsInline muted={muted} />;
};

