/**
 * Metrics adapter interface
 * Abstracts metrics collection (logging, Prometheus, custom backends)
 */

export interface MetricLabels {
  [key: string]: string | number | boolean
}

export interface MetricsAdapter {
  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: MetricLabels, value?: number): void

  /**
   * Record a gauge value
   */
  recordGauge(name: string, value: number, labels?: MetricLabels): void

  /**
   * Record a histogram value (for distributions, like response times)
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): void

  /**
   * Start a timer and return a function to stop it
   */
  startTimer(name: string, labels?: MetricLabels): () => void

  /**
   * Flush metrics (if adapter buffers them)
   */
  flush?(): Promise<void>
}

/**
 * Console metrics adapter (for development)
 */
export class ConsoleMetricsAdapter implements MetricsAdapter {
  incrementCounter(
    name: string,
    labels?: MetricLabels,
    value: number = 1
  ): void {
    console.log('[Metric:Counter]', name, { labels, value })
  }

  recordGauge(name: string, value: number, labels?: MetricLabels): void {
    console.log('[Metric:Gauge]', name, { value, labels })
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    console.log('[Metric:Histogram]', name, { value, labels })
  }

  startTimer(name: string, labels?: MetricLabels): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.recordHistogram(name, duration, labels)
    }
  }
}

/**
 * In-memory metrics adapter (for testing and aggregation)
 */
export class InMemoryMetricsAdapter implements MetricsAdapter {
  private counters: Map<string, number> = new Map()
  private gauges: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()

  incrementCounter(
    name: string,
    labels?: MetricLabels,
    value: number = 1
  ): void {
    const key = this.getKey(name, labels)
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + value)
  }

  recordGauge(name: string, value: number, labels?: MetricLabels): void {
    const key = this.getKey(name, labels)
    this.gauges.set(key, value)
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    const key = this.getKey(name, labels)
    const values = this.histograms.get(key) || []
    values.push(value)
    this.histograms.set(key, values)
  }

  startTimer(name: string, labels?: MetricLabels): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.recordHistogram(name, duration, labels)
    }
  }

  private getKey(name: string, labels?: MetricLabels): string {
    if (!labels) return name
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',')
    return `${name}{${labelStr}}`
  }

  /**
   * Get all metrics for inspection
   */
  getMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(this.histograms),
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters.clear()
    this.gauges.clear()
    this.histograms.clear()
  }
}

/**
 * Prometheus-compatible metrics adapter (stub)
 */
export class PrometheusMetricsAdapter implements MetricsAdapter {
  constructor(private registry?: any) {
    // TODO: Initialize Prometheus client
  }

  incrementCounter(
    name: string,
    labels?: MetricLabels,
    value: number = 1
  ): void {
    // TODO: Implement Prometheus counter
    console.log('[Prometheus:Counter]', name, { labels, value })
  }

  recordGauge(name: string, value: number, labels?: MetricLabels): void {
    // TODO: Implement Prometheus gauge
    console.log('[Prometheus:Gauge]', name, { value, labels })
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    // TODO: Implement Prometheus histogram
    console.log('[Prometheus:Histogram]', name, { value, labels })
  }

  startTimer(name: string, labels?: MetricLabels): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.recordHistogram(name, duration, labels)
    }
  }
}
