import { describe, it, expect, vi } from 'vitest'
import {
  InMemoryEventBus,
  DomainEventType,
  createDomainEvent,
  EventHandler,
} from '../domain/events'

describe('Event System', () => {
  describe('InMemoryEventBus', () => {
    it('should publish and handle events', async () => {
      const bus = new InMemoryEventBus()
      const handler = {
        handle: vi.fn(),
      }

      bus.subscribe(DomainEventType.ProjectCreated, handler)

      const event = createDomainEvent(
        DomainEventType.ProjectCreated,
        { projectId: '123', name: 'Test' }
      )

      await bus.publish(event)

      expect(handler.handle).toHaveBeenCalledWith(event)
    })

    it('should handle multiple handlers for same event', async () => {
      const bus = new InMemoryEventBus()
      const handler1 = { handle: vi.fn() }
      const handler2 = { handle: vi.fn() }

      bus.subscribe(DomainEventType.AnnotationCreated, handler1)
      bus.subscribe(DomainEventType.AnnotationCreated, handler2)

      const event = createDomainEvent(
        DomainEventType.AnnotationCreated,
        { annotationId: '456' }
      )

      await bus.publish(event)

      expect(handler1.handle).toHaveBeenCalledWith(event)
      expect(handler2.handle).toHaveBeenCalledWith(event)
    })

    it('should unsubscribe handlers', async () => {
      const bus = new InMemoryEventBus()
      const handler = { handle: vi.fn() }

      bus.subscribe(DomainEventType.ReviewApproved, handler)
      bus.unsubscribe(DomainEventType.ReviewApproved, handler)

      const event = createDomainEvent(
        DomainEventType.ReviewApproved,
        { reviewId: '789' }
      )

      await bus.publish(event)

      expect(handler.handle).not.toHaveBeenCalled()
    })

    it('should continue processing if one handler fails', async () => {
      const bus = new InMemoryEventBus()
      const failingHandler = {
        handle: vi.fn().mockRejectedValue(new Error('Handler error')),
      }
      const workingHandler = { handle: vi.fn() }

      bus.subscribe(DomainEventType.TaskCompleted, failingHandler)
      bus.subscribe(DomainEventType.TaskCompleted, workingHandler)

      const event = createDomainEvent(
        DomainEventType.TaskCompleted,
        { taskId: '999' }
      )

      await bus.publish(event)

      expect(failingHandler.handle).toHaveBeenCalled()
      expect(workingHandler.handle).toHaveBeenCalled()
    })
  })

  describe('createDomainEvent', () => {
    it('should create event with required fields', () => {
      const event = createDomainEvent(
        DomainEventType.ItemAssigned,
        { itemId: '123', annotatorId: '456' }
      )

      expect(event).toHaveProperty('id')
      expect(event).toHaveProperty('type', DomainEventType.ItemAssigned)
      expect(event).toHaveProperty('timestamp')
      expect(event).toHaveProperty('payload', {
        itemId: '123',
        annotatorId: '456',
      })
    })

    it('should include metadata when provided', () => {
      const event = createDomainEvent(
        DomainEventType.ProjectCreated,
        { projectId: '789' },
        { userId: 'user-123', source: 'web' }
      )

      expect(event.metadata).toEqual({
        userId: 'user-123',
        source: 'web',
      })
    })
  })
})
