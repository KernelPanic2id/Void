import { useEffect, useRef, useState } from 'react';
import UseVoiceSettingsProps from '../models/useVoiceSettingsProps.model';

/**
 * Manages all voice-related user settings persisted to localStorage.
 * Keeps the noise-gate worklet in sync with threshold / auto mode changes.
 */
export function useVoiceSettings({ noiseGateNodeRef }: UseVoiceSettingsProps) {
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
    const [voiceAvatar, setVoiceAvatar] = useState<string | null>(() => localStorage.getItem('voiceAvatar') || null);

    // Persist settings to localStorage
    useEffect(() => { localStorage.setItem('selectedMic', selectedMic); }, [selectedMic]);
    useEffect(() => { localStorage.setItem('selectedSpeaker', selectedSpeaker); }, [selectedSpeaker]);
    useEffect(() => { localStorage.setItem('webrtcNoiseSuppression', webrtcNoiseSuppressionEnabled.toString()); }, [webrtcNoiseSuppressionEnabled]);
    useEffect(() => { localStorage.setItem('vadAuto', vadAuto.toString()); }, [vadAuto]);
    useEffect(() => { localStorage.setItem('vadThreshold', vadThreshold.toString()); }, [vadThreshold]);
    useEffect(() => { localStorage.setItem('vadMode', vadMode); }, [vadMode]);
    useEffect(() => { localStorage.setItem('pttKey', pttKey); }, [pttKey]);
    useEffect(() => {
        if (voiceAvatar) localStorage.setItem('voiceAvatar', voiceAvatar);
        else localStorage.removeItem('voiceAvatar');
    }, [voiceAvatar]);

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

