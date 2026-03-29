import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ClientSignalMessage } from '../types/clientSignal.type';
import { ServerSignalMessage } from '../types/serverSignal.type';
import VoicePeer from '../models/voicePeer.model';
import VoiceState from '../models/voiceState.model';
import { useToast } from './ToastContext';
import initWasm, { calculate_network_quality } from '../pkg/core_wasm';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'ws://127.0.0.1:3001/ws';

const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export interface ExtendedVoiceState extends VoiceState {
    networkQuality: 0 | 1 | 2 | 3;
    ping: number;
}

const VoiceContext = createContext<ExtendedVoiceState | undefined>(undefined);

export const VoiceProvider = ({ children }: { children: ReactNode }) => {
    const { addToast } = useToast();
    const [channelId, setChannelId] = useState<string | null>(null);
    const [participants, setParticipants] = useState<VoicePeer[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    const [networkQuality, setNetworkQuality] = useState<0 | 1 | 2 | 3>(3);
    const [ping, setPing] = useState<number>(0);
    const [wasmReady, setWasmReady] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const userIdRef = useRef<string>(buildUserId());
    const channelIdRef = useRef<string | null>(null);

    useEffect(() => {
        initWasm().then(() => setWasmReady(true)).catch(console.error);
    }, []);

    useEffect(() => {
        if (!isConnected || !wasmReady) return;
        const updateStats = async () => {
            let totalRTT = 0, totalLoss = 0, totalJitter = 0, rttCount = 0;
            for (const pc of peerConnectionsRef.current.values()) {
                if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') continue;
                const stats = await pc.getStats();
                stats.forEach((report) => {
                    if (report.type === 'remote-inbound-rtp' && report.roundTripTime !== undefined) {
                        totalRTT += report.roundTripTime * 1000; rttCount++;
                    } else if (rttCount === 0 && report.type === 'candidate-pair' && report.nominated && report.state === 'succeeded' && report.currentRoundTripTime !== undefined) {
                        totalRTT += report.currentRoundTripTime * 1000; rttCount++;
                    }
                    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                        if (report.packetsLost !== undefined && report.packetsReceived !== undefined) totalLoss += report.packetsLost / (report.packetsLost + report.packetsReceived || 1);
                        if (report.jitter !== undefined) totalJitter += report.jitter * 1000;
                    }
                });
            }
            if (rttCount > 0) {
                const avgRTT = totalRTT / rttCount;
                setPing(Math.max(1, Math.round(avgRTT)));
                setNetworkQuality(calculate_network_quality(avgRTT, totalLoss / (rttCount || 1), totalJitter / (rttCount || 1)) as 0 | 1 | 2 | 3);
            } else { setPing(0); setNetworkQuality(3); }
        };
        const interval = setInterval(updateStats, 2000);
        return () => clearInterval(interval);
    }, [isConnected, wasmReady]);

    const sendSignal = useCallback((payload: ClientSignalMessage) => {
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
    }, []);

    const createPeerConnection = useCallback((peer: VoicePeer) => {
        let pc = peerConnectionsRef.current.get(peer.userId);
        if (!pc) {
            pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            const local = localStreamRef.current;
            if (local) local.getAudioTracks().forEach(t => pc!.addTrack(t, local));
            pc.onicecandidate = (e) => {
                if (e.candidate && channelIdRef.current) {
                    sendSignal({ type: 'ice', channelId: channelIdRef.current, from: userIdRef.current, to: peer.userId, candidate: e.candidate.toJSON() });
                }
            };
            pc.ontrack = (e) => {
                if (e.track.kind === 'audio') setRemoteStreams(p => new Map(p).set(peer.userId, e.streams[0]));
            };
            peerConnectionsRef.current.set(peer.userId, pc);
        }
        return pc;
    }, [sendSignal]);

    const joinChannel = useCallback(async (nextChannelId: string, username: string) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            setLocalStream(stream);
            const socket = new WebSocket(SIGNALING_URL);
            socketRef.current = socket;
            socket.onopen = () => {
                channelIdRef.current = nextChannelId;
                setChannelId(nextChannelId);
                sendSignal({ type: 'join', channelId: nextChannelId, userId: userIdRef.current, username });
            };
            socket.onmessage = async (e) => {
                const msg = JSON.parse(e.data) as ServerSignalMessage;
                if (msg.type === 'joined') {
                    setIsConnected(true);
                    setParticipants([{ userId: userIdRef.current, username, isMuted, isDeafened }, ...msg.peers]);
                    msg.peers.forEach(createPeerConnection);
                } else if (msg.type === 'peer-joined') {
                    setParticipants(p => [...p, msg.peer]);
                    createPeerConnection(msg.peer);
                    addToast(`${msg.peer.username} a rejoint`, 'join');
                } else if (msg.type === 'peer-left') {
                    const pc = peerConnectionsRef.current.get(msg.userId);
                    if (pc) { pc.close(); peerConnectionsRef.current.delete(msg.userId); }
                    setParticipants(p => p.filter(part => part.userId !== msg.userId));
                    setRemoteStreams(p => { const n = new Map(p); n.delete(msg.userId); return n; });
                } else if (msg.type === 'peer-state') {
                    setParticipants(prev => prev.map(p => p.userId === msg.userId ? { ...p, isMuted: msg.isMuted, isDeafened: msg.isDeafened } : p));
                } else if (msg.type === 'offer') {
                    const pc = createPeerConnection({ userId: msg.from, username: msg.fromUsername });
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendSignal({ type: 'answer', channelId: msg.channelId, from: userIdRef.current, to: msg.from, sdp: answer });
                } else if (msg.type === 'answer') {
                    const pc = peerConnectionsRef.current.get(msg.from);
                    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                } else if (msg.type === 'ice') {
                    const pc = peerConnectionsRef.current.get(msg.from);
                    if (pc) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
                }
            };
        } catch (err) { setError("Micro error"); }
    }, [isMuted, isDeafened, sendSignal, createPeerConnection, addToast]);

    const leaveChannel = useCallback(() => {
        if (channelIdRef.current) sendSignal({ type: 'leave', channelId: channelIdRef.current, userId: userIdRef.current });
        peerConnectionsRef.current.forEach(pc => pc.close());
        peerConnectionsRef.current.clear();
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        setIsConnected(false); setChannelId(null); setParticipants([]);
    }, [sendSignal]);

    const toggleMute = useCallback(() => {
        const next = !isMuted;
        if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !next);
        setIsMuted(next);
        setParticipants(prev => prev.map(p => p.userId === userIdRef.current ? { ...p, isMuted: next } : p));
        if (channelIdRef.current) sendSignal({ type: 'media-state', channelId: channelIdRef.current, userId: userIdRef.current, isMuted: next, isDeafened });
    }, [isMuted, isDeafened, sendSignal]);

    const toggleDeafen = useCallback(() => {
        const next = !isDeafened;
        setIsDeafened(next);
        setIsMuted(next);
        if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !next);
        setParticipants(prev => prev.map(p => p.userId === userIdRef.current ? { ...p, isDeafened: next, isMuted: next } : p));
        if (channelIdRef.current) sendSignal({ type: 'media-state', channelId: channelIdRef.current, userId: userIdRef.current, isMuted: next, isDeafened: next });
    }, [isDeafened, sendSignal]);

    const value = useMemo(() => ({
        channelId, participants, isConnected, isMuted, isDeafened, error,
        localUserId: userIdRef.current, localStream, joinChannel, leaveChannel,
        toggleMute, toggleDeafen, remoteStreams, remoteVideoStreams: new Map(),
        networkQuality, ping, addScreenTrack: () => {}, removeScreenTrack: () => {},
        userVolumes: new Map(), setUserVolume: () => {}, smartGateEnabled: true
    }), [channelId, participants, isConnected, isMuted, isDeafened, error, localStream, joinChannel, leaveChannel, toggleMute, toggleDeafen, remoteStreams, networkQuality, ping]);

    return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};

export const useVoiceStore = () => {
    const context = useContext(VoiceContext);
    if (!context) throw new Error('useVoiceStore must be used within VoiceProvider');
    return context;
};

function buildUserId() { return `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
