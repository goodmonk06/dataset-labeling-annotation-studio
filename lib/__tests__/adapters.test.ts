import { describe, it, expect, vi } from 'vitest'
import {
  InMemoryMetricsAdapter,
  ConsoleMetricsAdapter,
} from '../adapters/metrics.adapter'
import {
  ConsoleNotificationAdapter,
  WebhookNotificationAdapter,
} from '../adapters/notification.adapter'
import {
  JSONLExportAdapter,
  OpenAIExportAdapter,
  ExportAdapterRegistry,
} from '../adapters/export.adapter'

describe('Adapters', () => {
  describe('MetricsAdapter', () => {
    it('should increment counters', () => {
      const adapter = new InMemoryMetricsAdapter()

      adapter.incrementCounter('requests', { endpoint: '/api/projects' })
      adapter.incrementCounter('requests', { endpoint: '/api/projects' })
      adapter.incrementCounter('requests', { endpoint: '/api/items' })

      const metrics = adapter.getMetrics()
      expect(metrics.counters['requests{endpoint=/api/projects}']).toBe(2)
      expect(metrics.counters['requests{endpoint=/api/items}']).toBe(1)
    })

    it('should record gauge values', () => {
      const adapter = new InMemoryMetricsAdapter()

      adapter.recordGauge('active_users', 10)
      adapter.recordGauge('active_users', 15)

      const metrics = adapter.getMetrics()
      expect(metrics.gauges['active_users']).toBe(15) // Latest value
    })

    it('should record histogram values', () => {
      const adapter = new InMemoryMetricsAdapter()

      adapter.recordHistogram('request_duration', 100)
      adapter.recordHistogram('request_duration', 150)
      adapter.recordHistogram('request_duration', 120)

      const metrics = adapter.getMetrics()
      expect(metrics.histograms['request_duration']).toEqual([100, 150, 120])
    })

    it('should measure time with timer', () => {
      const adapter = new InMemoryMetricsAdapter()

      const stop = adapter.startTimer('operation_time')
      // Simulate some work
      stop()

      const metrics = adapter.getMetrics()
      expect(metrics.histograms['operation_time']).toBeDefined()
      expect(metrics.histograms['operation_time'].length).toBe(1)
      expect(metrics.histograms['operation_time'][0]).toBeGreaterThanOrEqual(0)
    })
  })

  describe('NotificationAdapter', () => {
    it('should send console notification', async () => {
      const adapter = new ConsoleNotificationAdapter()

      const result = await adapter.send(
        { id: '1', email: 'test@example.com' },
        { subject: 'Test', body: 'Hello' }
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toBeDefined()
    })

    it('should send webhook notification', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([['X-Message-ID', 'msg-123']]),
      })

      const adapter = new WebhookNotificationAdapter('https://example.com/webhook')

      const result = await adapter.send(
        { id: '1', email: 'test@example.com' },
        { subject: 'Test', body: 'Hello' }
      )

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  })

  describe('ExportAdapter', () => {
    const sampleRecords = [
      {
        input: 'This is great!',
        annotation: { labels: ['positive'] },
        metadata: {
          projectId: 'p1',
          projectName: 'Test',
          taskType: 'text_classification',
          itemId: 'i1',
          annotationId: 'a1',
          annotatedAt: '2024-01-01T00:00:00Z',
        },
      },
      {
        input: 'This is terrible.',
        annotation: { labels: ['negative'] },
        metadata: {
          projectId: 'p1',
          projectName: 'Test',
          taskType: 'text_classification',
          itemId: 'i2',
          annotationId: 'a2',
          annotatedAt: '2024-01-01T00:00:00Z',
        },
      },
    ]

    it('should export as JSONL', async () => {
      const adapter = new JSONLExportAdapter()

      const result = await adapter.export(sampleRecords)

      expect(result.contentType).toBe('application/jsonl')
      expect(result.filename).toContain('.jsonl')

      const lines = result.data.split('\n')
      expect(lines.length).toBe(2)

      const first = JSON.parse(lines[0])
      expect(first.input).toBe('This is great!')
      expect(first.annotation.labels).toEqual(['positive'])
    })

    it('should export as OpenAI format', async () => {
      const adapter = new OpenAIExportAdapter()

      const result = await adapter.export(sampleRecords)

      const lines = result.data.split('\n')
      const first = JSON.parse(lines[0])

      expect(first.messages).toBeDefined()
      expect(first.messages.length).toBe(3)
      expect(first.messages[0].role).toBe('system')
      expect(first.messages[1].role).toBe('user')
      expect(first.messages[2].role).toBe('assistant')
    })

    it('should register and retrieve adapters', () => {
      const registry = new ExportAdapterRegistry()

      const jsonlAdapter = registry.get('jsonl')
      expect(jsonlAdapter).toBeDefined()
      expect(jsonlAdapter?.getFormatName()).toBe('JSONL')

      const list = registry.list()
      expect(list.length).toBeGreaterThanOrEqual(4)
      expect(list.find((a) => a.name === 'openai')).toBeDefined()
    })
  })
})
