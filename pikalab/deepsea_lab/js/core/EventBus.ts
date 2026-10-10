type Callback = (data?: any) => void;

class EventBus {
    private listeners: Record<string, Callback[]> = {};

    on(event: string, callback: Callback): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event: string, callback: Callback): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event: string, data?: any): void {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (err) {
                console.error(`Error in event listener for ${event}:`, err);
            }
        });
    }
}

export const eventBus = new EventBus();
