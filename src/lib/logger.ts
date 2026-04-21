const isDev = import.meta.env.DEV;

export function log(context: string, message: string, data?: unknown): void {
    if (isDev) {
        console.log(`[${context}] ${message}`, data !== undefined ? data : '');
    }
}

export function logError(context: string, message: string, error?: unknown): void {
    console.error(`[${context}] ${message}`, error !== undefined ? error : '');
}
