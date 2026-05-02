export default interface VoiceTileProps {
    userId: string;
    username: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isDeafened: boolean;
    videoStream: MediaStream | null;
    screenStream: MediaStream | null;
    /**
     * Remote audio MediaStream (null for the local user). Rendered through a
     * hidden `<audio>` so peers without a video track are still audible.
     */
    audioStream: MediaStream | null;
    avatarUrl: string | null;
    isLocal: boolean;
    isSpotlighted: boolean;
    isWatchingSpotlight: boolean;
    /** Local user's deafen state — mutes every remote `<audio>` sink. */
    localDeafened: boolean;
    onClick?: () => void;
}

