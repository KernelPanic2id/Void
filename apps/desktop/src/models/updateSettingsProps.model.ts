export interface UpdateSettingsProps {
    updateAvailable: boolean;
    updateStatus: string | null;
    triggerUpdate: () => Promise<void>;
    checkForUpdate: () => Promise<void>;
}

