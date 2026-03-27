// src/components/stream/StreamCard.tsx
import { useEffect, useRef } from 'react';
import  StreamCardProps  from '../../models/streamProps.model.ts';

export const StreamCard = ({ stream, username, isBright }: StreamCardProps) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        video.srcObject = stream;

        if (stream) {
            void video.play().catch(() => {
                // Autoplay can fail transiently if browser policies change.
            });
        }
    }, [stream]);

    return (
        <div className={`relative aspect-video rounded-lg overflow-hidden bg-black border-2 transition-all duration-300 ${
            isBright
                ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'border-transparent shadow-none'
        }`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />

            {/* Badge Pseudo style Discord */}
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isBright ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                <span className="text-xs font-bold text-white">{username}</span>
            </div>

            {/* Overlay d'alerte si trop lumineux */}
            {isBright && (
                <div className="absolute inset-0 pointer-events-none border-[4px] border-red-500/30 animate-pulse" />
            )}
        </div>
    );
};