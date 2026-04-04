import { useEffect, useState } from 'react';
import { calculate_network_quality } from '../pkg/core_wasm';

interface UseNetworkStatsProps {
    pc: RTCPeerConnection | null;
    isConnected: boolean;
    wasmReady: boolean;
}

export const useNetworkStats = ({ pc, isConnected, wasmReady }: UseNetworkStatsProps) => {
    const [networkQuality, setNetworkQuality] = useState<0 | 1 | 2 | 3>(3);
    const [ping, setPing] = useState<number>(0);

    useEffect(() => {
        if (!isConnected || !wasmReady) return;

        const interval = setInterval(async () => {
            try {
                if (pc && (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')) {
                    const stats = await pc.getStats();
                    let totalRTT = 0, count = 0, totalLoss = 0, totalJitter = 0;
                    let candidatePairRTT: number | undefined;

                    stats.forEach(r => {
                        if (r.type === 'candidate-pair' && (r.state === 'succeeded' || r.nominated) && r.currentRoundTripTime !== undefined) {
                            candidatePairRTT = r.currentRoundTripTime * 1000;
                        }
                        if (r.type === 'remote-inbound-rtp' && r.roundTripTime !== undefined) {
                            totalRTT += r.roundTripTime * 1000;
                            count++;
                        }
                        if (r.type === 'inbound-rtp' && r.kind === 'audio') {
                            const total = (r.packetsLost || 0) + (r.packetsReceived || 0);
                            if (total > 0) {
                                totalLoss += (r.packetsLost || 0) / total;
                            }
                            if (r.jitter !== undefined) totalJitter += r.jitter * 1000;
                        }
                    });

                    const countDiv = Math.max(1, count);
                    let finalRTT = 0;
                    if (count > 0) {
                        finalRTT = totalRTT / count;
                    } else if (candidatePairRTT !== undefined) {
                        finalRTT = candidatePairRTT;
                    } else {
                        stats.forEach(r => {
                            if (r.roundTripTime !== undefined) finalRTT = r.roundTripTime * 1000;
                            else if (r.currentRoundTripTime !== undefined) finalRTT = r.currentRoundTripTime * 1000;
                        });
                    }

                    if (finalRTT > 0) {
                        setPing(Math.max(1, Math.round(finalRTT)));
                        if (typeof calculate_network_quality === 'function') {
                            setNetworkQuality(calculate_network_quality(finalRTT, totalLoss / countDiv, totalJitter / countDiv) as 0 | 1 | 2 | 3);
                        }
                    }
                }
            } catch (e) {
                // Ignore stats errors
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [isConnected, wasmReady, pc]);

    return { networkQuality, ping };
};

