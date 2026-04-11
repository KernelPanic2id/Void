import { useEffect, useRef, useState } from 'react';
import UseVoiceSettingsProps from '../models/voice/useVoiceSettingsProps.model';

/**
 * Manages all voice-related user settings persisted to localStorage.
 * Keeps the noise-gate worklet in sync with threshold / auto mode changes.
 */
export function useVoiceSettings({ noiseGateNodeRef, username }: UseVoiceSettingsProps) {

    const [smartGateEnabled, setSmartGateEnabled] = useState(true);
    const [vadAuto, setVadAuto] = useState(() => localStorage.getItem('vadAuto') !== 'false');
    const [vadThreshold, setVadThreshold] = useState(() => Number(localStorage.getItem('vadThreshold')) || 0.13);
    const [vadMode, setVadMode] = useState<'VAD' | 'PTT'>(() => (localStorage.getItem('vadMode') as 'VAD' | 'PTT') || 'VAD');
    const [pttKey, setPttKey] = useState(() => localStorage.getItem('pttKey') || 'KeyV');
    const rawMicVolumeRef = useRef<number>(0);
    const [selectedMic, setSelectedMic] = useState(() => localStorage.getItem('selectedMic') || '');
    const [selectedSpeaker, setSelectedSpeaker] = useState(() => localStorage.getItem('selectedSpeaker') || '');
    const [webrtcNoiseSuppressionEnabled, setWebrtcNoiseSuppressionEnabled] = useState(
        () => localStorage.getItem('webrtcNoiseSuppression') !== 'false',
    );

    const [voiceAvatar, setVoiceAvatar] = useState<string | null>(() => {
        if (!username) return null;
        return localStorage.getItem(`voiceAvatar_${username}`) || null;
    });

    // Flag to skip the persist effect right after a username-triggered load
    const skipPersistRef = useRef(false);

    // One-time cleanup: purge legacy key and corrupted scoped keys from migration bug
    useEffect(() => {
        localStorage.removeItem('voiceAvatar');
        if (!localStorage.getItem('_va_clean_v1')) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const _key = localStorage.key(i);
                if (_key?.startsWith('voiceAvatar_')) localStorage.removeItem(_key);
            }
            localStorage.setItem('_va_clean_v1', '1');
        }
    }, []);

    // Reload the correct avatar when the active user changes
    useEffect(() => {
        skipPersistRef.current = true;
        if (username) {
            setVoiceAvatar(localStorage.getItem(`voiceAvatar_${username}`) || null);
        } else {
            setVoiceAvatar(null);
        }
    }, [username]);

    // Persist settings to localStorage
    useEffect(() => { localStorage.setItem('selectedMic', selectedMic); }, [selectedMic]);
    useEffect(() => { localStorage.setItem('selectedSpeaker', selectedSpeaker); }, [selectedSpeaker]);
    useEffect(() => { localStorage.setItem('webrtcNoiseSuppression', webrtcNoiseSuppressionEnabled.toString()); }, [webrtcNoiseSuppressionEnabled]);
    useEffect(() => { localStorage.setItem('vadAuto', vadAuto.toString()); }, [vadAuto]);
    useEffect(() => { localStorage.setItem('vadThreshold', vadThreshold.toString()); }, [vadThreshold]);
    useEffect(() => { localStorage.setItem('vadMode', vadMode); }, [vadMode]);
    useEffect(() => { localStorage.setItem('pttKey', pttKey); }, [pttKey]);
    useEffect(() => {
        if (skipPersistRef.current) {
            skipPersistRef.current = false;
            return;
        }
        if (!username) return;
        if (voiceAvatar) localStorage.setItem(`voiceAvatar_${username}`, voiceAvatar);
        else localStorage.removeItem(`voiceAvatar_${username}`);
    }, [voiceAvatar, username]);

    // Forward threshold changes to the noise-gate worklet
    useEffect(() => {
        if (noiseGateNodeRef.current) {
            const db = (vadThreshold * 100) - 100;
            const activeDb = vadAuto ? -80 : db;
            const linearThreshold = Math.pow(10, activeDb / 20);
            noiseGateNodeRef.current.port.postMessage({
                type: 'UPDATE_THRESHOLD',
                threshold: linearThreshold,
                autoMode: vadAuto,
            });
        }
    }, [vadThreshold, vadAuto, noiseGateNodeRef]);

    return {
        smartGateEnabled, setSmartGateEnabled,
        vadAuto, setVadAuto,
        vadThreshold, setVadThreshold,
        vadMode, setVadMode,
        pttKey, setPttKey,
        rawMicVolumeRef,
        selectedMic, setSelectedMic,
        selectedSpeaker, setSelectedSpeaker,
        webrtcNoiseSuppressionEnabled, setWebrtcNoiseSuppressionEnabled,
        voiceAvatar, setVoiceAvatar,
    };
}

