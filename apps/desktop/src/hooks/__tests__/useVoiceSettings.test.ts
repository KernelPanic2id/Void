import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';

beforeEach(() => localStorage.clear());

function renderSettings(username: string | null = 'testuser') {
    const noiseGateNodeRef = { current: null };
    return renderHook(() => useVoiceSettings({ noiseGateNodeRef, username }));
}

describe('useVoiceSettings', () => {
    it('defaults vadMode to VAD', () => {
        const { result } = renderSettings();
        expect(result.current.vadMode).toBe('VAD');
    });

    it('persists vadMode to localStorage on change', () => {
        const { result } = renderSettings();
        act(() => result.current.setVadMode('PTT'));
        expect(result.current.vadMode).toBe('PTT');
        expect(localStorage.getItem('vadMode')).toBe('PTT');
    });

    it('persists pttKey to localStorage', () => {
        const { result } = renderSettings();
        act(() => result.current.setPttKey('Space'));
        expect(localStorage.getItem('pttKey')).toBe('Space');
    });

    it('persists vadThreshold to localStorage', () => {
        const { result } = renderSettings();
        act(() => result.current.setVadThreshold(0.5));
        expect(localStorage.getItem('vadThreshold')).toBe('0.5');
    });

    it('persists selectedMic to localStorage', () => {
        const { result } = renderSettings();
        act(() => result.current.setSelectedMic('mic-id'));
        expect(localStorage.getItem('selectedMic')).toBe('mic-id');
    });

    it('persists selectedSpeaker to localStorage', () => {
        const { result } = renderSettings();
        act(() => result.current.setSelectedSpeaker('spk-id'));
        expect(localStorage.getItem('selectedSpeaker')).toBe('spk-id');
    });

    it('defaults vadAuto to true', () => {
        const { result } = renderSettings();
        expect(result.current.vadAuto).toBe(true);
    });

    it('reads initial vadMode from localStorage', () => {
        localStorage.setItem('vadMode', 'PTT');
        const { result } = renderSettings();
        expect(result.current.vadMode).toBe('PTT');
    });
});

