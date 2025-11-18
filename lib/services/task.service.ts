/**
 * Task assignment and management service
 */

import { prisma } from '../prisma'
import { ItemStatus } from '@prisma/client'
import { logger } from '../logger'
import { DomainEventType, createDomainEvent, InMemoryEventBus } from '../domain/events'

export class TaskService {
  constructor(private eventBus: InMemoryEventBus = new InMemoryEventBus()) {}

  /**
   * Assign items to an annotator
   */
  async assignItems(
    projectId: string,
    itemIds: string[],
    annotatorId: string,
    dueDate?: Date
  ): Promise<number> {
    try {
      const tasks = await prisma.$transaction(
        itemIds.map((itemId) =>
          prisma.annotationTask.create({
            data: {
              projectId,
              itemId,
              annotatorId,
              status: ItemStatus.assigned,
              dueDate,
            },
          })
        )
      )

      // Update item statuses
      await prisma.item.updateMany({
        where: { id: { in: itemIds } },
        data: { status: ItemStatus.assigned },
      })

      // Emit events
      for (const task of tasks) {
        await this.eventBus.publish(
          createDomainEvent(DomainEventType.ItemAssigned, {
            itemId: task.itemId,
            projectId,
            annotatorId,
            taskId: task.id,
            dueDate,
          })
        )
      }

      logger.info('Items assigned to annotator', {
        projectId,
        annotatorId,
        itemCount: itemIds.length,
      })

      return tasks.length
    } catch (error) {
      logger.error('Failed to assign items', error as Error, {
        projectId,
        annotatorId,
      })
      throw error
    }
  }

  /**
   * Get tasks for an annotator
   */
  async getTasksForAnnotator(
    annotatorId: string,
    status?: ItemStatus
  ) {
    const where: any = { annotatorId }
    if (status) {
      where.status = status
    }

    return await prisma.annotationTask.findMany({
      where,
      include: {
        item: true,
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Mark task as started
   */
  async startTask(taskId: string) {
    const task = await prisma.annotationTask.update({
      where: { id: taskId },
      data: {
        status: ItemStatus.in_progress,
        startedAt: new Date(),
      },
    })

    await prisma.item.update({
      where: { id: task.itemId },
      data: { status: ItemStatus.in_progress },
    })

    return task
  }

  /**
   * Mark task as completed
   */
  async completeTask(taskId: string) {
    const task = await prisma.annotationTask.update({
      where: { id: taskId },
      data: {
        status: ItemStatus.annotated,
        completedAt: new Date(),
      },
      include: { item: true },
    })

    await prisma.item.update({
      where: { id: task.itemId },
      data: { status: ItemStatus.annotated },
    })

    // Emit event
    await this.eventBus.publish(
      createDomainEvent(DomainEventType.TaskCompleted, {
        taskId: task.id,
        itemId: task.itemId,
        projectId: task.projectId,
        annotatorId: task.annotatorId,
        completedAt: task.completedAt!,
      })
    )

    return task
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks() {
    const now = new Date()
    return await prisma.annotationTask.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: [ItemStatus.assigned, ItemStatus.in_progress] },
      },
      include: {
        annotator: true,
        item: true,
        project: true,
      },
    })
  }

  /**
   * Batch assign items to multiple annotators (for IAA)
   */
  async batchAssignForAgreement(
    projectId: string,
    itemIds: string[],
    annotatorIds: string[],
    dueDate?: Date
  ) {
    const tasks = []

    for (const itemId of itemIds) {
      for (const annotatorId of annotatorIds) {
        const task = await prisma.annotationTask.create({
          data: {
            projectId,
            itemId,
            annotatorId,
            status: ItemStatus.assigned,
            dueDate,
          },
        })
        tasks.push(task)
      }
    }

    logger.info('Batch assigned items for IAA', {
      projectId,
      itemCount: itemIds.length,
      annotatorCount: annotatorIds.length,
      totalTasks: tasks.length,
    })

    return tasks
  }
}

export const taskService = new TaskService()
