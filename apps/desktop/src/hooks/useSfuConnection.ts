import { useCallback, useRef } from 'react';
import { ServerSignal } from '../types/serverSignal.type';
import UseSfuConnectionProps from '../models/voice/useSfuConnectionProps.model';

const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Manages the single SFU peer-connection, screen-track lifecycle,
 * and dispatching of incoming signaling messages.
 */
export function useSfuConnection({
    sendSignal, localStreamRef, userIdRef, usernameRef, addToast,
    setParticipants, setChannelStartedAt, setRemoteStreams,
    setRemoteVideoStreams, setChatMessages, setBandwidthStats, setError,
}: UseSfuConnectionProps) {

    const sfuConnectionRef = useRef<RTCPeerConnection | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const trackToUserMapRef = useRef<Map<string, string>>(new Map());

    const removeScreenTrack = useCallback(() => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }
    }, []);

    const addScreenTrack = useCallback(async (stream: MediaStream) => {
        screenStreamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.onended = () => removeScreenTrack();
            if (sfuConnectionRef.current) {
                sfuConnectionRef.current.addTrack(videoTrack, stream);
            }
        }
    }, [removeScreenTrack]);

    const connectSFU = useCallback(async () => {
        if (sfuConnectionRef.current) sfuConnectionRef.current.close();

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        sfuConnectionRef.current = pc;

        const local = localStreamRef.current;
        if (local) local.getAudioTracks().forEach(t => pc.addTrack(t, local));

        const screen = screenStreamRef.current;
        if (screen) screen.getVideoTracks().forEach(t => pc.addTrack(t, screen));

        pc.onicecandidate = (e) => {
            if (e.candidate) sendSignal({ type: 'ice', candidate: e.candidate.toJSON() } as any);
        };

        pc.ontrack = (e) => {
            if (!e.streams?.[0]) return;
            const stream = e.streams[0];
            const track = e.track;
            const uid = trackToUserMapRef.current.get(track.id);

            if (uid) {
                if (track.kind === 'audio') setRemoteStreams(r => new Map(r).set(uid, stream));
                else if (track.kind === 'video') setRemoteVideoStreams(r => new Map(r).set(uid, stream));
            } else {
                if (track.kind === 'audio') setRemoteStreams(r => new Map(r).set(stream.id, stream));
                else if (track.kind === 'video') setRemoteVideoStreams(r => new Map(r).set(stream.id, stream));
            }
        };

        pc.onnegotiationneeded = async () => {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal({ type: 'offer', sdp: offer } as any);
            } catch (err) { console.error("RTC negotiation error:", err); }
        };
    }, [sendSignal, localStreamRef, setRemoteStreams, setRemoteVideoStreams]);

    /** Dispatches every incoming server signal to the appropriate state updater. */
    const handleMessage = useCallback(async (data: string) => {
        try {
            const msg = JSON.parse(data) as ServerSignal;
            switch (msg.type) {
                case 'joined':
                    if (msg.channelId !== 'global') {
                        const peers = msg.peers.map((p: any) => ({
                            ...p, isMuted: !!p.isMuted, isDeafened: !!p.isDeafened,
                        }));
                        setParticipants([
                            { userId: userIdRef.current, username: usernameRef.current, isMuted: false, isDeafened: false },
                            ...peers,
                        ]);
                        setChannelStartedAt(msg.startedAt);
                        connectSFU();
                    }
                    break;
                case 'peer-joined': {
                    const peer = { ...msg.peer, isMuted: !!msg.peer.isMuted, isDeafened: !!msg.peer.isDeafened };
                    setParticipants(p => p.some(part => part.userId === peer.userId) ? p : [...p, peer]);
                    addToast(`${msg.peer.username} a rejoint le salon`, 'join');
                    break;
                }
                case 'peer-left':
                    setParticipants(p => {
                        const _leaving = p.find(part => part.userId === msg.userId);
                        if (_leaving) addToast(`${_leaving.username} a quitté le salon`, 'leave');
                        return p.filter(part => part.userId !== msg.userId);
                    });
                    break;
                case 'peer-state':
                    setParticipants(p => p.map(part =>
                        part.userId === msg.userId ? { ...part, isMuted: msg.isMuted, isDeafened: msg.isDeafened } : part));
                    break;
                case 'track-map':
                    trackToUserMapRef.current.set(msg.trackId, msg.userId);
                    setRemoteStreams(prev => {
                        if (!prev.has(msg.streamId)) return prev;
                        const _next = new Map(prev);
                        _next.set(msg.userId, prev.get(msg.streamId)!);
                        return _next;
                    });
                    setRemoteVideoStreams(prev => {
                        if (!prev.has(msg.streamId)) return prev;
                        const _next = new Map(prev);
                        _next.set(msg.userId, prev.get(msg.streamId)!);
                        return _next;
                    });
                    break;
                case 'offer':
                    if (!sfuConnectionRef.current) connectSFU();
                    await sfuConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                    const _answer = await sfuConnectionRef.current!.createAnswer();
                    await sfuConnectionRef.current!.setLocalDescription(_answer);
                    sendSignal({ type: 'answer', sdp: _answer } as any);
                    break;
                case 'answer':
                    if (sfuConnectionRef.current) await sfuConnectionRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                    break;
                case 'ice':
                    if (sfuConnectionRef.current && msg.candidate) await sfuConnectionRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
                    break;
                case 'chat':
                    setChatMessages(prev => {
                        const id = `${msg.from}-${msg.timestamp}`;
                        if (prev.some(m => m.id === id)) return prev;
                        return [...prev, { id, from: msg.from, username: msg.username, message: msg.message, timestamp: Number(msg.timestamp) }];
                    });
                    break;
                case 'stats':
                    setBandwidthStats(prev => new Map(prev).set(msg.userId, msg.bandwidthBps));
                    break;
                case 'error':
                    setError(msg.message);
                    break;
            }
        } catch (e) { console.error("Signal parsing error:", e); }
    }, [connectSFU, sendSignal, addToast, userIdRef, usernameRef, setParticipants, setChannelStartedAt, setRemoteStreams, setRemoteVideoStreams, setChatMessages, setBandwidthStats, setError]);

    return {
        sfuConnectionRef, screenStreamRef,
        connectSFU, handleMessage,
        addScreenTrack, removeScreenTrack,
    };
}

