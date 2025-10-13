/**
 * Server-Sent Events (SSE) Parser
 * Handles partial chunks and buffer management for reliable stream parsing
 */

export interface SSEEvent {
  type: string;
  data: any;
  id?: string;
  retry?: number;
}

export class SSEParser {
  private buffer: string = '';
  private eventId: string | null = null;
  private eventRetry: number | null = null;

  /**
   * Parse incoming chunk and return complete events
   * Handles partial data by buffering incomplete lines
   * Supports both standard SSE format and custom marker format
   */
  parse(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];

    // Check for custom marker format (__PROGRESS__, __TOOL__, __METRICS__, etc.)
    const markerRegex = /__(\w+)__(.*?)__END__/g;
    let match;

    while ((match = markerRegex.exec(this.buffer)) !== null) {
      const markerType = match[1].toLowerCase();
      const markerData = match[2];

      try {
        const parsedData = JSON.parse(markerData);
        events.push({
          type: parsedData.type || markerType,
          data: parsedData,
        });
      } catch (error) {
        console.error('Marker parse error:', error, 'Data:', markerData);
      }
    }

    // Remove processed markers from buffer
    this.buffer = this.buffer.replace(/__\w+__.*?__END__/g, '');

    // Parse standard SSE format
    const lines = this.buffer.split('\n');

    // Keep the last incomplete line in buffer
    this.buffer = lines.pop() || '';

    let currentEvent: Partial<SSEEvent> = {};

    for (const line of lines) {
      // Empty line signals end of event
      if (line.trim() === '') {
        if (currentEvent.type && currentEvent.data) {
          events.push(currentEvent as SSEEvent);
          currentEvent = {};
        }
        continue;
      }

      // Parse different SSE fields
      if (line.startsWith('data: ')) {
        try {
          const dataStr = line.slice(6);
          currentEvent.data = JSON.parse(dataStr);

          // Extract type from data if present
          if (typeof currentEvent.data === 'object' && currentEvent.data.type) {
            currentEvent.type = currentEvent.data.type;
          } else {
            currentEvent.type = 'message';
          }
        } catch (error) {
          console.error('SSE parse error:', error, 'Line:', line);
          currentEvent.type = 'error';
          currentEvent.data = {
            message: 'Failed to parse event data',
            raw: line,
          };
        }
      } else if (line.startsWith('id: ')) {
        currentEvent.id = line.slice(4);
        this.eventId = currentEvent.id;
      } else if (line.startsWith('retry: ')) {
        const retryMs = parseInt(line.slice(7), 10);
        if (!isNaN(retryMs)) {
          currentEvent.retry = retryMs;
          this.eventRetry = retryMs;
        }
      } else if (line.startsWith('event: ')) {
        currentEvent.type = line.slice(7);
      } else if (line.trim() && !line.startsWith(':')) {
        // Handle plain text as message content (for streaming)
        events.push({
          type: 'message',
          data: line,
        });
      }
    }

    // If we have a complete event at the end, add it
    if (currentEvent.type && currentEvent.data) {
      events.push(currentEvent as SSEEvent);
    }

    return events;
  }

  /**
   * Get the last event ID (for reconnection)
   */
  getLastEventId(): string | null {
    return this.eventId;
  }

  /**
   * Get the retry interval in milliseconds
   */
  getRetryInterval(): number | null {
    return this.eventRetry;
  }

  /**
   * Reset the parser state
   */
  reset(): void {
    this.buffer = '';
    this.eventId = null;
    this.eventRetry = null;
  }

  /**
   * Check if there's buffered data
   */
  hasBuffer(): boolean {
    return this.buffer.length > 0;
  }
}

/**
 * Fetch SSE stream with automatic retry and reconnection
 */
export interface SSEStreamOptions {
  url: string;
  method?: 'GET' | 'POST';
  body?: any;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
  onEvent?: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  signal?: AbortSignal;
}

export async function streamSSE(options: SSEStreamOptions): Promise<void> {
  const {
    url,
    method = 'POST',
    body,
    headers = {},
    maxRetries = 3,
    retryDelay = 1000,
    onEvent,
    onError,
    onComplete,
    signal,
  } = options;

  let attempt = 0;
  const parser = new SSEParser();

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...headers,
          // Include Last-Event-ID for reconnection
          ...(parser.getLastEventId() && {
            'Last-Event-ID': parser.getLastEventId()!,
          }),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onComplete?.();
          return; // Stream complete, exit successfully
        }

        const chunk = decoder.decode(value, { stream: true });
        const events = parser.parse(chunk);

        for (const event of events) {
          onEvent?.(event);

          // Handle error events
          if (event.type === 'error') {
            const error = new Error(
              event.data?.message || 'Stream error occurred'
            );
            onError?.(error);
            throw error; // Will trigger retry
          }

          // Handle complete events
          if (event.type === 'complete') {
            onComplete?.();
            return; // Stream complete, exit successfully
          }
        }
      }
    } catch (error: any) {
      attempt++;

      // If signal was aborted, don't retry
      if (signal?.aborted) {
        onError?.(new Error('Stream aborted'));
        return;
      }

      console.error(`SSE stream error (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt >= maxRetries) {
        const finalError = new Error(
          `Stream failed after ${maxRetries} attempts: ${error.message}`
        );
        onError?.(finalError);
        throw finalError;
      }

      // Exponential backoff
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Create an AbortController with timeout
 */
export function createTimeoutSignal(timeoutMs: number): {
  signal: AbortSignal;
  abort: () => void;
  clear: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    abort: () => controller.abort(),
    clear: () => clearTimeout(timeoutId),
  };
}
