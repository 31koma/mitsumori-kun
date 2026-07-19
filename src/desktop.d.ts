export {};

declare global {
    interface Window {
        mitsumoriDesktop?: {
            reloadApp: () => Promise<boolean>;
            updateApp: () => Promise<{ ok: boolean; message: string }>;
        };
    }
}
