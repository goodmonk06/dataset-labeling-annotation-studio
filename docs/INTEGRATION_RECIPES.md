# Integration Recipes

This document provides practical recipes for integrating the Annotation Studio into larger AI/ML ecosystems.

## Table of Contents
- [OpenAI Fine-Tuning Pipeline](#openai-fine-tuning-pipeline)
- [Hugging Face Dataset Creation](#hugging-face-dataset-creation)
- [Active Learning Loop](#active-learning-loop)
- [Webhook Integration](#webhook-integration)
- [Custom Metrics Collection](#custom-metrics-collection)
- [Multi-Service Architecture](#multi-service-architecture)

---

## OpenAI Fine-Tuning Pipeline

### End-to-End Workflow

```typescript
// 1. Export annotations
const response = await fetch(
  `/api/projects/${projectId}/annotations/export?format=openai`
)
const blob = await response.blob()

// 2. Upload to OpenAI
const file = await openai.files.create({
  file: blob,
  purpose: 'fine-tune',
})

// 3. Create fine-tuning job
const fineTune = await openai.fineTuning.jobs.create({
  training_file: file.id,
  model: 'gpt-4o-mini',
})

// 4. Monitor progress
const job = await openai.fineTuning.jobs.retrieve(fineTune.id)
```

### Automated Pipeline with Events

```typescript
import { EventHandler, DomainEventType } from '@/lib/domain/events'

class OpenAIFineTuneHandler implements EventHandler {
  async handle(event: DomainEvent) {
    if (event.type === DomainEventType.ProjectCompleted) {
      const { projectId } = event.payload

      // Export annotations
      const annotations = await exportAnnotations(projectId, 'openai')

      // Upload and start fine-tuning
      const job = await startFineTuning(annotations)

      // Store job ID for tracking
      await prisma.project.update({
        where: { id: projectId },
        data: {
          metadataJson: JSON.stringify({
            fineTuneJobId: job.id,
          }),
        },
      })
    }
  }
}

// Register handler
eventBus.subscribe(DomainEventType.ProjectCompleted, new OpenAIFineTuneHandler())
```

---

## Hugging Face Dataset Creation

### Creating a Dataset Card

```python
# scripts/create_hf_dataset.py
from datasets import Dataset, DatasetDict
import json

def load_annotations(file_path):
    """Load JSONL annotations"""
    data = []
    with open(file_path) as f:
        for line in f:
            item = json.loads(line)
            data.append({
                'text': item['input'],
                'label': item['annotation']['labels'][0],
                'metadata': item['metadata']
            })
    return data

# Load data
annotations = load_annotations('annotations-export.jsonl')

# Split data
from sklearn.model_selection import train_test_split
train, temp = train_test_split(annotations, test_size=0.3)
val, test = train_test_split(temp, test_size=0.5)

# Create dataset
dataset = DatasetDict({
    'train': Dataset.from_list(train),
    'validation': Dataset.from_list(val),
    'test': Dataset.from_list(test)
})

# Push to Hub
dataset.push_to_hub('my-org/my-dataset')
```

### Integration via Webhook

```typescript
// Webhook endpoint in external service
app.post('/webhooks/annotation-studio', async (req, res) => {
  const { type, payload } = req.body

  if (type === 'project.completed') {
    // Fetch annotations
    const response = await fetch(
      `${STUDIO_URL}/api/projects/${payload.projectId}/annotations/export`
    )
    const jsonl = await response.text()

    // Process and upload to HuggingFace
    await createHuggingFaceDataset(jsonl, payload.projectName)
  }

  res.json({ success: true })
})
```

---

## Active Learning Loop

### Basic Active Learning Integration

```typescript
/**
 * Active learning workflow:
 * 1. Train model on labeled data
 * 2. Model predicts on unlabeled data
 * 3. Select uncertain examples for annotation
 * 4. Annotate and retrain
 */

interface UncertaintyScore {
  itemId: string
  text: string
  uncertainty: number // 0-1
  prediction: any
}

class ActiveLearningService {
  async selectItemsForAnnotation(
    projectId: string,
    modelPredictions: UncertaintyScore[],
    count: number = 100
  ): Promise<string[]> {
    // Sort by uncertainty (highest first)
    const sorted = modelPredictions
      .sort((a, b) => b.uncertainty - a.uncertainty)
      .slice(0, count)

    // Update item priorities
    for (const pred of sorted) {
      await prisma.item.update({
        where: { id: pred.itemId },
        data: {
          priority: 'high',
          difficulty: Math.ceil(pred.uncertainty * 5),
          inputMetaJson: JSON.stringify({
            modelPrediction: pred.prediction,
            uncertainty: pred.uncertainty,
          }),
        },
      })
    }

    return sorted.map((s) => s.itemId)
  }

  async assignToAnnotators(itemIds: string[], annotatorIds: string[]) {
    await taskService.batchAssignForAgreement(
      projectId,
      itemIds,
      annotatorIds
    )
  }
}
```

### Automated Retraining Pipeline

```typescript
// Event handler for automatic retraining
class RetrainingHandler implements EventHandler {
  private threshold = 100 // Retrain after 100 new annotations

  async handle(event: DomainEvent) {
    if (event.type === DomainEventType.AnnotationCreated) {
      const count = await this.getAnnotationsSinceLastTrain(
        event.payload.projectId
      )

      if (count >= this.threshold) {
        await this.triggerRetraining(event.payload.projectId)
      }
    }
  }

  private async triggerRetraining(projectId: string) {
    // Export latest annotations
    const annotations = await exportAnnotations(projectId)

    // Call ML training service
    await fetch('http://ml-service/train', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        annotations,
        config: { epochs: 10, batch_size: 32 },
      }),
    })

    // Update metadata
    await prisma.project.update({
      where: { id: projectId },
      data: {
        metadataJson: JSON.stringify({
          lastTrainedAt: new Date().toISOString(),
        }),
      },
    })
  }
}
```

---

## Webhook Integration

### Setting Up Webhooks

```typescript
// lib/services/webhook.service.ts
import { WebhookNotificationAdapter } from '@/lib/adapters/notification.adapter'

class WebhookService {
  private adapter: WebhookNotificationAdapter

  constructor(webhookUrl: string) {
    this.adapter = new WebhookNotificationAdapter(webhookUrl)
  }

  async notifyAnnotationCreated(annotation: Annotation) {
    await this.adapter.send(
      { id: 'webhook', name: 'System' },
      {
        subject: 'Annotation Created',
        body: JSON.stringify({
          event: 'annotation.created',
          data: {
            annotationId: annotation.id,
            itemId: annotation.itemId,
            projectId: annotation.projectId,
            createdAt: annotation.createdAt,
          },
        }),
      }
    )
  }
}

// Register with event bus
eventBus.subscribe(
  DomainEventType.AnnotationCreated,
  {
    handle: async (event) => {
      const webhookUrl = process.env.WEBHOOK_URL
      if (webhookUrl) {
        const service = new WebhookService(webhookUrl)
        await service.notifyAnnotationCreated(event.payload)
      }
    },
  }
)
```

### Webhook Receiver Example

```typescript
// External service receiving webhooks
app.post('/webhooks/annotation-studio', async (req, res) => {
  const { event, data } = JSON.parse(req.body.body)

  switch (event) {
    case 'annotation.created':
      await updateMetrics(data)
      break
    case 'project.completed':
      await triggerDownstreamProcessing(data)
      break
    case 'quality.threshold_failed':
      await notifyQualityTeam(data)
      break
  }

  res.json({ received: true })
})
```

---

## Custom Metrics Collection

### Prometheus Integration

```typescript
// lib/adapters/prometheus.adapter.ts (production implementation)
import promClient from 'prom-client'

class PrometheusMetricsAdapter implements MetricsAdapter {
  private counters = new Map<string, promClient.Counter>()
  private gauges = new Map<string, promClient.Gauge>()
  private histograms = new Map<string, promClient.Histogram>()

  constructor() {
    // Register default metrics
    promClient.collectDefaultMetrics()
  }

  incrementCounter(name: string, labels?: MetricLabels, value = 1) {
    let counter = this.counters.get(name)

    if (!counter) {
      counter = new promClient.Counter({
        name,
        help: `Counter for ${name}`,
        labelNames: labels ? Object.keys(labels) : [],
      })
      this.counters.set(name, counter)
    }

    counter.inc(labels as any, value)
  }

  // ... other methods
}
```

### Custom Metrics Example

```typescript
// Track annotation quality over time
class QualityMetricsCollector {
  constructor(private metrics: MetricsAdapter) {}

  async collectProjectMetrics(projectId: string) {
    const report = await qualityService.generateQualityReport(projectId)

    this.metrics.recordGauge('annotations_total', report.metrics.totalAnnotations, {
      project_id: projectId,
    })

    this.metrics.recordGauge(
      'annotation_confidence_avg',
      report.metrics.averageConfidence,
      { project_id: projectId }
    )

    this.metrics.recordGauge(
      'annotation_time_avg_ms',
      report.metrics.averageTimeMs,
      { project_id: projectId }
    )

    // Per-annotator metrics
    for (const perf of report.annotatorPerformance) {
      this.metrics.recordGauge('annotator_throughput', perf.count, {
        project_id: projectId,
        annotator_id: perf.annotatorId,
      })
    }
  }
}
```

---

## Multi-Service Architecture

### Service Integration Pattern

```
┌──────────────────┐
│  Auth Service    │ ← User authentication
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Annotation Studio│ ← Main service (this repo)
└────────┬─────────┘
         │
         ├──────────→ ┌──────────────────┐
         │            │  ML Service      │ ← Training, inference
         │            └──────────────────┘
         │
         ├──────────→ ┌──────────────────┐
         │            │ Notification Hub │ ← Email, Slack, etc.
         │            └──────────────────┘
         │
         └──────────→ ┌──────────────────┐
                      │ Data Lake / DWH  │ ← Analytics
                      └──────────────────┘
```

### Configuration Example

```typescript
// lib/config.ts
export const config = {
  auth: {
    enabled: process.env.AUTH_ENABLED === 'true',
    serviceUrl: process.env.AUTH_SERVICE_URL,
  },
  ml: {
    enabled: process.env.ML_ENABLED === 'true',
    serviceUrl: process.env.ML_SERVICE_URL,
  },
  notifications: {
    enabled: process.env.NOTIFICATIONS_ENABLED === 'true',
    adapter: process.env.NOTIFICATION_ADAPTER || 'console',
    webhookUrl: process.env.WEBHOOK_URL,
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    adapter: process.env.METRICS_ADAPTER || 'console',
  },
}

// lib/services/factory.ts
export function createServices() {
  return {
    notification: createNotificationAdapter(),
    metrics: createMetricsAdapter(),
    storage: createStorageAdapter(),
    export: new ExportAdapterRegistry(),
  }
}

function createNotificationAdapter(): NotificationAdapter {
  switch (config.notifications.adapter) {
    case 'webhook':
      return new WebhookNotificationAdapter(config.notifications.webhookUrl!)
    case 'email':
      return new EmailNotificationAdapter(/* config */)
    default:
      return new ConsoleNotificationAdapter()
  }
}
```

### Cross-Service Communication

```typescript
// Fetch user details from auth service
async function getUserDetails(externalUserId: string) {
  if (!config.auth.enabled) return null

  const response = await fetch(
    `${config.auth.serviceUrl}/users/${externalUserId}`
  )
  return response.json()
}

// Submit to ML service for training
async function submitForTraining(projectId: string) {
  if (!config.ml.enabled) return

  const annotations = await exportAnnotations(projectId, 'jsonl')

  await fetch(`${config.ml.serviceUrl}/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      annotations,
    }),
  })
}
```

---

## Best Practices

### Event Handler Registration

```typescript
// Centralize event handler registration
// lib/events/handlers/index.ts

export function registerAllHandlers(bus: EventBus) {
  // Metrics
  bus.subscribe(DomainEventType.AnnotationCreated, metricsHandler)

  // Notifications
  bus.subscribe(DomainEventType.ReviewRejected, notificationHandler)

  // ML Integration
  if (config.ml.enabled) {
    bus.subscribe(DomainEventType.ProjectCompleted, mlTrainingHandler)
  }

  // Quality Monitoring
  bus.subscribe(DomainEventType.QualityThresholdFailed, alertHandler)
}
```

### Error Handling in Integrations

```typescript
class ResilientIntegrationHandler implements EventHandler {
  constructor(
    private maxRetries = 3,
    private retryDelayMs = 1000
  ) {}

  async handle(event: DomainEvent) {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.doHandle(event)
        return
      } catch (error) {
        logger.warn(`Integration failed, attempt ${attempt + 1}`, { error })

        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelayMs * Math.pow(2, attempt))
        } else {
          logger.error('Integration failed after retries', error as Error)
          // Store in dead letter queue or alert
        }
      }
    }
  }

  private async doHandle(event: DomainEvent) {
    // Actual integration logic
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
```

---

## Further Reading

- [Architecture Documentation](./ARCHITECTURE.md)
- [Domain Model](./DOMAIN_NOTES.md)
- [OpenAI Fine-Tuning Guide](https://platform.openai.com/docs/guides/fine-tuning)
- [Hugging Face Datasets](https://huggingface.co/docs/datasets/)
