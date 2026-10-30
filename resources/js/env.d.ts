/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Window {
    __pwaInstall?: { prompt: BeforeInstallPromptEvent | null; installed: boolean };
}

interface Navigator {
    standalone?: boolean;
}
