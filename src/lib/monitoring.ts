/**
 * Monitoring & Performance Tracking
 * Lightweight error/performance logging without external dependencies.
 * In production, these hooks can be wired to Sentry, Datadog, etc.
 */

export function initMonitoring() {
  if (import.meta.env.PROD) {
    // Global unhandled promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      logError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
        source: "unhandledrejection",
      });
    });

    // Global error handler
    window.addEventListener("error", (event) => {
      logError(event.error || new Error(event.message), {
        source: "window.onerror",
        filename: event.filename,
        lineno: event.lineno,
      });
    });
  }
}

export function logError(error: Error, context?: Record<string, unknown>) {
  console.error("Error:", error.message, context);

  // In production, forward to an external service (Sentry, etc.)
  if (import.meta.env.PROD) {
    // Future: Sentry.captureException(error, { extra: context });
  }
}

export function logPerformance(
  name: string,
  duration: number,
  metadata?: Record<string, unknown>
) {
  if (import.meta.env.DEV) {
    console.log(`⏱ ${name}: ${duration.toFixed(1)}ms`, metadata);
  }

  if (import.meta.env.PROD && duration > 1000) {
    console.warn(`Slow operation: ${name} took ${duration.toFixed(0)}ms`, metadata);
  }
}

/**
 * Track an async operation's performance and errors
 */
export async function trackPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    logPerformance(name, performance.now() - start);
    return result;
  } catch (error) {
    logError(error as Error, { operation: name, duration: performance.now() - start });
    throw error;
  }
}
