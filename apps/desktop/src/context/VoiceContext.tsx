import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ClientSignalMessage } from '../types/clientSignal.type';
import { ServerSignalMessage } from '../types/serverSignal.type';
import VoicePeer from '../models/voicePeer.model';
import VoiceState from '../models/voiceState.model';
import { useToast } from './ToastContext';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'ws://127.0.0.1:3001/ws';

const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(import.meta.env.VITE_TURN_URL
        ? [{
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USER || '',
            credential: import.meta.env.VITE_TURN_PASS || '',
        }]
        : []),
];


const VoiceContext = createContext<VoiceState | undefined>(undefined);

export const VoiceProvider = ({ children }: { children: ReactNode }) => {
    const { addToast } = useToast();
    const [channelId, setChannelId] = useState<string | null>(null);
    const [participants, setParticipants] = useState<VoicePeer[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [remoteVideoStreams, setRemoteVideoStreams] = useState<Map<string, MediaStream>>(new Map());
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [userVolumes, setUserVolumes] = useState<VolumeMap>(new Map());
    const [smartGateEnabled] = useState(true);

    const socketRef = useRef<WebSocket | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    // Ajout d'un flag de négociation par peer
    const negotiatingRef = useRef<Map<string, boolean>>(new Map());
    const userIdRef = useRef<string>(buildUserId());
    const usernameRef = useRef<string>('Anonymous');
    const channelIdRef = useRef<string | null>(null);

    const sendSignal = useCallback((payload: ClientSignalMessage) => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }
        socket.send(JSON.stringify(payload));
    }, []);

    const removePeerConnection = useCallback((peerId: string) => {
        const pc = peerConnectionsRef.current.get(peerId);
        if (pc) {
            pc.ontrack = null;
            pc.onicecandidate = null;
            pc.close();
            peerConnectionsRef.current.delete(peerId);
        }
        negotiatingRef.current.delete(peerId);

        setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
        });

        setRemoteVideoStreams((prev) => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
        });

        setParticipants((prev) => prev.filter((peer) => peer.userId !== peerId));
    }, []);

    const createPeerConnection = useCallback((peer: VoicePeer) => {
        let pc = peerConnectionsRef.current.get(peer.userId);
        if (!pc) {
            pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

            // Ajout du flag de négociation
            negotiatingRef.current.set(peer.userId, false);

            // Add audio tracks
            const localStream = localStreamRef.current;
            if (localStream) {
                const audioTracks = localStream.getAudioTracks();
                console.log('[VoiceContext] localStream audioTracks (avant ajout)', audioTracks.map(t => ({
                    id: t.id,
                    enabled: t.enabled,
                    muted: t.muted,
                    readyState: t.readyState
                })));
                for (const track of audioTracks) {
                    // Correction : forcer la track à être activée si non muté
                    if (!isMuted) {
                        if (!track.enabled) {
                            console.warn('[VoiceContext] Track locale désactivée, on la réactive');
                            track.enabled = true;
                        }
                    }
                    console.log('[VoiceContext] Ajout de la track audio à RTCPeerConnection', {
                        id: track.id,
                        enabled: track.enabled,
                        muted: track.muted,
                        readyState: track.readyState
                    });
                    pc.addTrack(track, localStream);
                }
            } else {
                console.warn('[VoiceContext] Pas de localStream pour', peer.userId);
            }

            // Ajout du handler negotiationneeded pour renégociation automatique
            pc.onnegotiationneeded = async () => {
                if (!channelIdRef.current) return;
                if (!pc) return;
                if (negotiatingRef.current.get(peer.userId)) {
                    console.warn('[VoiceContext] Négociation déjà en cours pour', peer.userId);
                    return;
                }
                negotiatingRef.current.set(peer.userId, true);
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    console.log('[VoiceContext] Envoi offer SDP à', peer.userId, offer);
                    sendSignal({
                        type: 'offer',
                        channelId: channelIdRef.current,
                        from: userIdRef.current,
                        to: peer.userId,
                        sdp: offer,
                    });
                } catch (e) {
                    console.warn('[VoiceContext] Erreur negotiationneeded', e);
                } finally {
                    negotiatingRef.current.set(peer.userId, false);
                }
            };

            pc.onicecandidate = (event) => {
                if (!event.candidate || !channelIdRef.current) {
                    return;
                }
                console.log('[VoiceContext] Envoi ICE candidate à', peer.userId, event.candidate);
                sendSignal({
                    type: 'ice',
                    channelId: channelIdRef.current,
                    from: userIdRef.current,
                    to: peer.userId,
                    candidate: event.candidate.toJSON(),
                });
            };

            pc.ontrack = (event) => {
                const [stream] = event.streams;
                if (!stream) {
                    return;
                }
                console.log('[VoiceContext] ontrack reçu', event.track.kind, 'de', peer.userId, stream);
                // Capture explicite du peerId pour les closures
                const currentPeerId = peer.userId;

                if (event.track.kind === 'audio') {
                    setRemoteStreams((prev) => {
                        const next = new Map(prev);
                        next.set(currentPeerId, stream);
                        return next;
                    });

                    // Clean up when remote stops speaking (track ended or muted)
                    event.track.onended = () => {
                        setRemoteStreams((prev) => {
                            const next = new Map(prev);
                            next.delete(currentPeerId);
                            return next;
                        });
                    };
                    event.track.onmute = () => {
                        setRemoteStreams((prev) => {
                            const next = new Map(prev);
                            next.delete(currentPeerId);
                            return next;
                        });
                    };
                    event.track.onunmute = () => {
                        setRemoteStreams((prev) => {
                            const next = new Map(prev);
                            next.set(currentPeerId, stream);
                            return next;
                        });
                    };
                } else if (event.track.kind === 'video') {
                    setRemoteVideoStreams((prev) => {
                        const next = new Map(prev);
                        next.set(currentPeerId, stream);
                        return next;
                    });

                    // Clean up when remote stops sharing
                    event.track.onended = () => {
                        setRemoteVideoStreams((prev) => {
                            const next = new Map(prev);
                            next.delete(currentPeerId);
                            return next;
                        });
                    };
                    event.track.onmute = () => {
                        setRemoteVideoStreams((prev) => {
                            const next = new Map(prev);
                            next.delete(currentPeerId);
                            return next;
                        });
                    };
                    event.track.onunmute = () => {
                        setRemoteVideoStreams((prev) => {
                            const next = new Map(prev);
                            next.set(currentPeerId, stream);
                            return next;
                        });
                    };
                }
            };

            peerConnectionsRef.current.set(peer.userId, pc);

            setParticipants((prev) => {
                if (prev.some((p) => p.userId === peer.userId)) {
                    return prev;
                }
                return [...prev, peer];
            });
        }
        // Ajout ou MAJ de la track vidéo du screen share si active
        const screenStream = screenStreamRef.current;
        if (screenStream) {
            const videoTrack = screenStream.getVideoTracks()[0];
            if (videoTrack) {
                const hasVideo = pc.getSenders().some((s) => s.track?.kind === 'video');
                if (!hasVideo) {
                    pc.addTrack(videoTrack, screenStream);
                }
            }
        }
        return pc;
    }, [sendSignal]);

    const handleOffer = useCallback(async (msg: Extract<ServerSignalMessage, { type: 'offer' }>) => {
        if (!channelIdRef.current || channelIdRef.current !== msg.channelId) {
            return;
        }

        const peer: VoicePeer = { userId: msg.from, username: msg.fromUsername };
        const pc = createPeerConnection(peer);

        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal({
            type: 'answer',
            channelId: msg.channelId,
            from: userIdRef.current,
            to: msg.from,
            sdp: answer,
        });
    }, [createPeerConnection, sendSignal]);

    const handleAnswer = useCallback(async (msg: Extract<ServerSignalMessage, { type: 'answer' }>) => {
        const pc = peerConnectionsRef.current.get(msg.from);
        if (!pc) {
            return;
        }
        // Correction : ne setRemoteDescription que si l'état est correct
        if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        } else {
            console.warn('[VoiceContext] Ignoré setRemoteDescription(answer) car signalingState =', pc.signalingState);
        }
    }, []);

    const handleIce = useCallback(async (msg: Extract<ServerSignalMessage, { type: 'ice' }>) => {
        const peer: VoicePeer = { userId: msg.from, username: msg.fromUsername };
        const pc = createPeerConnection(peer);
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }, [createPeerConnection]);

    const leaveChannel = useCallback(() => {
        const activeChannel = channelIdRef.current;
        if (activeChannel) {
            sendSignal({
                type: 'leave',
                channelId: activeChannel,
                userId: userIdRef.current,
            });
        }

        for (const peerId of peerConnectionsRef.current.keys()) {
            removePeerConnection(peerId);
        }

        const local = localStreamRef.current;
        if (local) {
            for (const track of local.getTracks()) {
                track.stop();
            }
        }

        localStreamRef.current = null;
        setLocalStream(null);
        screenStreamRef.current = null;
        peerConnectionsRef.current.clear();

        const socket = socketRef.current;
        if (socket && socket.readyState <= WebSocket.OPEN) {
            socket.close();
        }

        socketRef.current = null;
        channelIdRef.current = null;
        setChannelId(null);
        setParticipants([]);
        setRemoteStreams(new Map());
        setRemoteVideoStreams(new Map());
        setIsConnected(false);
        setIsMuted(false);
        setIsDeafened(false);
    }, [removePeerConnection, sendSignal]);

    const joinChannel = useCallback(async (nextChannelId: string, username: string) => {
        if (!nextChannelId) {
            return;
        }
        if (channelIdRef.current) {
            leaveChannel();
        }
        setError(null);
        usernameRef.current = username || 'Anonymous';
        try {
            // Capture micro brute
            const rawStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });

            const audioCtx = new window.AudioContext();
            const source = audioCtx.createMediaStreamSource(rawStream);
            const dest = audioCtx.createMediaStreamDestination();

            // Charger le worklet (chemin relatif selon ton build)
            await audioCtx.audioWorklet.addModule('/src/worker/noise-gate.worklet.js');
            const node = new AudioWorkletNode(audioCtx, 'noise-gate-processor');

            // Envoyer les paramètres et chemins du module WASM au worklet
            node.port.postMessage({
                type: 'INIT_WASM',
                wasmJsPath: '/src/pkg/core_wasm.js', // adapte selon ton build
                wasmBinPath: '/src/pkg/core_wasm_bg.wasm',
                threshold: 0.08,
                attack: 0.003,
                release: 0.05,
            });

            // Toggle smart gate (bypass si désactivé)
            if (!smartGateEnabled) {
                source.connect(dest);
            } else {
                source.connect(node);
                node.connect(dest);
            }

            const localStream = dest.stream;
            localStreamRef.current = localStream;
            setLocalStream(localStream);

            const socket = new WebSocket(SIGNALING_URL);
            socketRef.current = socket;

            socket.onopen = () => {
                channelIdRef.current = nextChannelId;
                setChannelId(nextChannelId);
                setParticipants([{ userId: userIdRef.current, username: usernameRef.current }]);

                sendSignal({
                    type: 'join',
                    channelId: nextChannelId,
                    userId: userIdRef.current,
                    username: usernameRef.current,
                });
            };

            socket.onmessage = async (event) => {
                const msg = JSON.parse(event.data) as ServerSignalMessage;

                if (msg.type === 'error') {
                    setError(msg.message);
                    return;
                }

                if (msg.type === 'joined') {
                    console.log('[VoiceContext] joined reçu', msg);
                    setIsConnected(true);
                    // Correction : ajouter l'utilisateur local à la liste des participants
                    setParticipants([
                        {
                            userId: userIdRef.current,
                            username: usernameRef.current,
                            isMuted: isMuted,
                            isDeafened: isDeafened,
                        },
                        ...msg.peers.map((peer) => ({
                            ...peer,
                            isMuted: peer.isMuted ?? false,
                            isDeafened: peer.isDeafened ?? false,
                        })),
                    ]);
                    for (const peer of msg.peers) {
                        createPeerConnection(peer);
                        // SUPPRESSION de l'appel manuel à createOffer ici : on laisse onnegotiationneeded gérer
                    }
                    return;
                }

                if (msg.type === 'peer-joined') {
                    setParticipants((prev) => {
                        if (prev.some((p) => p.userId === msg.peer.userId)) {
                            return prev;
                        }
                        return [...prev, msg.peer];
                    });
                    addToast(`${msg.peer.username} a rejoint le salon`, 'join');
                    // SUPPRESSION de la renégociation manuelle ici : on laisse onnegotiationneeded gérer
                    return;
                }

                if (msg.type === 'peer-left') {
                    const leavingPeer = participants.find((p) => p.userId === msg.userId);
                    removePeerConnection(msg.userId);
                    const username = leavingPeer?.username || 'Un utilisateur';
                    addToast(`${username} a quitté le salon`, 'leave');
                    return;
                }

                if (msg.type === 'peer-state') {
                    console.log('[VoiceContext] peer-state reçu', msg);
                    setParticipants((prev) =>
                        prev.map((p) =>
                            p.userId === msg.userId
                                ? { ...p, isMuted: msg.isMuted, isDeafened: msg.isDeafened }
                                : p,
                        ),
                    );
                    return;
                }

                if (msg.type === 'offer') {
                    await handleOffer(msg);
                    return;
                }

                if (msg.type === 'answer') {
                    await handleAnswer(msg);
                    return;
                }

                if (msg.type === 'ice') {
                    await handleIce(msg);
                }
            };

            socket.onclose = () => {
                setIsConnected(false);
            };

            socket.onerror = () => {
                setError('Connexion signaling indisponible');
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Impossible d'accéder au micro";
            setError(message);
            leaveChannel();
        }
    }, [createPeerConnection, handleAnswer, handleIce, handleOffer, leaveChannel, removePeerConnection, sendSignal, addToast, participants, smartGateEnabled]);

    const toggleMute = useCallback(() => {
        const local = localStreamRef.current;
        if (!local) {
            return;
        }

        const nextMuted = !isMuted;
        for (const track of local.getAudioTracks()) {
            track.enabled = !nextMuted;
        }
        setIsMuted(nextMuted);

        // Update local participant state
        setParticipants((prev) =>
            prev.map((p) =>
                p.userId === userIdRef.current ? { ...p, isMuted: nextMuted } : p,
            ),
        );

        // Broadcast to other peers
        if (channelIdRef.current) {
            sendSignal({
                type: 'media-state',
                channelId: channelIdRef.current,
                userId: userIdRef.current,
                isMuted: nextMuted,
                isDeafened,
            });
        }
    }, [isMuted, isDeafened, sendSignal]);

    const toggleDeafen = useCallback(() => {
        const nextDeafened = !isDeafened;
        setIsDeafened(nextDeafened);

        // Update local participant state
        setParticipants((prev) =>
            prev.map((p) =>
                p.userId === userIdRef.current ? { ...p, isDeafened: nextDeafened } : p,
            ),
        );

        // Broadcast to other peers
        if (channelIdRef.current) {
            sendSignal({
                type: 'media-state',
                channelId: channelIdRef.current,
                userId: userIdRef.current,
                isMuted,
                isDeafened: nextDeafened,
            });
        }
    }, [isMuted, isDeafened, sendSignal]);


    const removeScreenTrack = useCallback(() => {
        screenStreamRef.current = null;
        for (const [, pc] of peerConnectionsRef.current.entries()) {
            const senders = pc.getSenders();
            for (const sender of senders) {
                if (sender.track?.kind === 'video') {
                    pc.removeTrack(sender);
                    // Déclencher la négociation manuellement
                    if (pc.onnegotiationneeded) pc.onnegotiationneeded(new Event('negotiationneeded'));
                }
            }
        }
    }, []);

    const addScreenTrack = useCallback((screenStream: MediaStream) => {
        screenStreamRef.current = screenStream;
        const videoTrack = screenStream.getVideoTracks()[0];
        if (!videoTrack) return;
        videoTrack.onended = () => {
            removeScreenTrack();
        };
        for (const [, pc] of peerConnectionsRef.current.entries()) {
            const hasVideo = pc.getSenders().some((s) => s.track?.kind === 'video');
            if (!hasVideo) {
                pc.addTrack(videoTrack, screenStream);
                // Déclencher la négociation manuellement
                if (pc.onnegotiationneeded) pc.onnegotiationneeded(new Event('negotiationneeded'));
            }
        }
    }, [removeScreenTrack]);


    // Setter pour le volume d'un utilisateur
    const setUserVolume = useCallback((userId: string, volume: number) => {
        setUserVolumes((prev) => {
            const next = new Map(prev);
            next.set(userId, volume);
            return next;
        });
    }, []);

    // Correction du useMemo : on retire denoiseEnabled et setDenoiseEnabled
    const value = useMemo<VoiceState>(() => ({
        channelId,
        participants,
        isConnected,
        isMuted,
        isDeafened,
        error,
        localUserId: userIdRef.current,
        localStream,
        joinChannel,
        leaveChannel,
        toggleMute,
        toggleDeafen,
        remoteStreams,
        remoteVideoStreams,
        addScreenTrack,
        removeScreenTrack,
        userVolumes,
        setUserVolume,
        smartGateEnabled,
    }), [
        channelId,
        participants,
        isConnected,
        isMuted,
        isDeafened,
        error,
        localStream,
        joinChannel,
        leaveChannel,
        toggleMute,
        toggleDeafen,
        remoteStreams,
        remoteVideoStreams,
        addScreenTrack,
        removeScreenTrack,
        userVolumes,
        setUserVolume,
        smartGateEnabled,
    ]);

    // Synchronisation systématique de l'état enabled des tracks audio locales avec isMuted
    useEffect(() => {
        const local = localStreamRef.current;
        if (!local) return;
        for (const track of local.getAudioTracks()) {
            if (track.enabled !== !isMuted) {
                track.enabled = !isMuted;
                console.log('[VoiceContext] Sync: track', track.id, 'enabled =', track.enabled, '(isMuted =', isMuted, ')');
            }
        }
    }, [isMuted, localStream]);

    return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};

export const useVoiceStore = () => {
    const context = useContext(VoiceContext);
    if (!context) {
        throw new Error('useVoiceStore must be used within VoiceProvider');
    }
    return context;
};

// Ajout du type VolumeMap manquant
 type VolumeMap = Map<string, number>;

// Ajout de la fonction utilitaire buildUserId manquante
function buildUserId() {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `user-${Date.now()}-${randomPart}`;
}
