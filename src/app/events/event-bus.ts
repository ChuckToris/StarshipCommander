type EventCallback = (payload: any) => void;

export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  subscribe(eventType: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    const callbacks = this.listeners.get(eventType)!;
    callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  emit(eventType: string, payload?: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      // Create a copy to avoid issues if callbacks modify the array
      const callbacksCopy = [...callbacks];
      callbacksCopy.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event callback for ${eventType}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  getListenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.length || 0;
  }
}

// Global event bus instance
export const eventBus = new EventBus();