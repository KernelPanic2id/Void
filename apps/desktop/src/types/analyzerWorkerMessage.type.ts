export type AnalyzerWorkerIncomingMessage = {
    type: 'ANALYZE';
    imageData: ArrayBuffer;
    width: number;
    height: number;
};

export type AnalyzerWorkerOutgoingMessage =
    | { type: 'READY' }
    | { type: 'RESULT'; payload: { lum: number; status: string; raw: string } }
    | { type: 'ERROR'; error: string };

