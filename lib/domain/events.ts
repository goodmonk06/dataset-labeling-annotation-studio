/**
 * Domain events
 * These represent important business events that other systems may react to
 */

export enum DomainEventType {
  // Project events
  ProjectCreated = 'project.created',
  ProjectStatusChanged = 'project.status_changed',
  ProjectCompleted = 'project.completed',

  // Item events
  ItemCreated = 'item.created',
  ItemStatusChanged = 'item.status_changed',
  ItemAssigned = 'item.assigned',

  // Annotation events
  AnnotationCreated = 'annotation.created',
  AnnotationUpdated = 'annotation.updated',
  AnnotationDeleted = 'annotation.deleted',

  // Review events
  ReviewSubmitted = 'review.submitted',
  ReviewApproved = 'review.approved',
  ReviewRejected = 'review.rejected',

  // Task events
  TaskAssigned = 'task.assigned',
  TaskCompleted = 'task.completed',
  TaskOverdue = 'task.overdue',

  // Batch events
  BatchCreated = 'batch.created',
  BatchCompleted = 'batch.completed',

  // Quality events
  QualityThresholdExceeded = 'quality.threshold_exceeded',
  QualityThresholdFailed = 'quality.threshold_failed',
}

export interface DomainEvent<T = any> {
  id: string
  type: DomainEventType
  timestamp: Date
  payload: T
  metadata?: {
    userId?: string
    source?: string
    [key: string]: any
  }
}

// Event payloads
export interface ProjectCreatedPayload {
  projectId: string
  name: string
  taskType: string
  createdBy?: string
}

export interface ItemAssignedPayload {
  itemId: string
  projectId: string
  annotatorId: string
  taskId: string
  dueDate?: Date
}

export interface AnnotationCreatedPayload {
  annotationId: string
  itemId: string
  projectId: string
  annotatorId?: string
  confidence?: number
  timeSpentMs?: number
}

export interface ReviewSubmittedPayload {
  reviewId: string
  annotationId: string
  itemId: string
  projectId: string
  reviewerId: string
  status: string
}

export interface TaskCompletedPayload {
  taskId: string
  itemId: string
  projectId: string
  annotatorId: string
  completedAt: Date
  timeSpentMs?: number
}

export interface QualityThresholdPayload {
  projectId: string
  itemId?: string
  metric: string
  threshold: number
  actualValue: number
  passed: boolean
}

/**
 * Event handler interface
 */
export interface EventHandler<T = any> {
  handle(event: DomainEvent<T>): Promise<void> | void
}

/**
 * Event bus interface
 */
export interface EventBus {
  publish<T = any>(event: DomainEvent<T>): Promise<void>
  subscribe<T = any>(
    eventType: DomainEventType,
    handler: EventHandler<T>
  ): void
  unsubscribe<T = any>(
    eventType: DomainEventType,
    handler: EventHandler<T>
  ): void
}

/**
 * In-memory event bus implementation
 */
export class InMemoryEventBus implements EventBus {
  private handlers: Map<DomainEventType, Set<EventHandler>> = new Map()

  async publish<T = any>(event: DomainEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type) || new Set()

    for (const handler of handlers) {
      try {
        await handler.handle(event)
      } catch (error) {
        console.error(`Error handling event ${event.type}:`, error)
        // In production, you might want to publish to a dead letter queue
      }
    }
  }

  subscribe<T = any>(
    eventType: DomainEventType,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
  }

  unsubscribe<T = any>(
    eventType: DomainEventType,
    handler: EventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
    }
  }
}

/**
 * Utility to create domain events
 */
export function createDomainEvent<T>(
  type: DomainEventType,
  payload: T,
  metadata?: DomainEvent['metadata']
): DomainEvent<T> {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date(),
    payload,
    metadata,
  }
}
