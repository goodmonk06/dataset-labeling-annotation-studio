import { describe, it, expect } from 'vitest'
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateItemSchema,
  CreateAnnotationSchema,
  TextClassificationDataSchema,
  TextSpanDataSchema,
} from '../validations'

describe('Validation Schemas', () => {
  describe('CreateProjectSchema', () => {
    it('should validate a valid project', () => {
      const validProject = {
        name: 'Test Project',
        taskType: 'text_classification' as const,
        labels: ['positive', 'negative'],
      }

      const result = CreateProjectSchema.safeParse(validProject)
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const invalidProject = {
        name: '',
        taskType: 'text_classification' as const,
        labels: ['positive'],
      }

      const result = CreateProjectSchema.safeParse(invalidProject)
      expect(result.success).toBe(false)
    })

    it('should reject empty labels array', () => {
      const invalidProject = {
        name: 'Test',
        taskType: 'text_classification' as const,
        labels: [],
      }

      const result = CreateProjectSchema.safeParse(invalidProject)
      expect(result.success).toBe(false)
    })

    it('should reject invalid task type', () => {
      const invalidProject = {
        name: 'Test',
        taskType: 'invalid_type',
        labels: ['test'],
      }

      const result = CreateProjectSchema.safeParse(invalidProject)
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateProjectSchema', () => {
    it('should allow partial updates', () => {
      const validUpdate = {
        name: 'Updated Name',
      }

      const result = UpdateProjectSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
    })

    it('should allow labels only update', () => {
      const validUpdate = {
        labels: ['label1', 'label2'],
      }

      const result = UpdateProjectSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
    })

    it('should allow empty object', () => {
      const result = UpdateProjectSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('CreateItemSchema', () => {
    it('should validate item with text', () => {
      const validItem = {
        inputText: 'Sample text',
      }

      const result = CreateItemSchema.safeParse(validItem)
      expect(result.success).toBe(true)
    })

    it('should validate item with metadata', () => {
      const validItem = {
        inputText: 'Sample text',
        inputMeta: { source: 'test', category: 'demo' },
      }

      const result = CreateItemSchema.safeParse(validItem)
      expect(result.success).toBe(true)
    })

    it('should allow empty object', () => {
      const result = CreateItemSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('TextClassificationDataSchema', () => {
    it('should validate classification with single label', () => {
      const validData = {
        labels: ['positive'],
      }

      const result = TextClassificationDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate classification with multiple labels', () => {
      const validData = {
        labels: ['positive', 'urgent'],
      }

      const result = TextClassificationDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty labels', () => {
      const invalidData = {
        labels: [],
      }

      const result = TextClassificationDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('TextSpanDataSchema', () => {
    it('should validate text spans', () => {
      const validData = {
        spans: [
          { start: 0, end: 10, label: 'PERSON' },
          { start: 15, end: 25, label: 'LOCATION' },
        ],
      }

      const result = TextSpanDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject negative indices', () => {
      const invalidData = {
        spans: [{ start: -1, end: 10, label: 'PERSON' }],
      }

      const result = TextSpanDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty spans array', () => {
      const invalidData = {
        spans: [],
      }

      const result = TextSpanDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty label', () => {
      const invalidData = {
        spans: [{ start: 0, end: 10, label: '' }],
      }

      const result = TextSpanDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateAnnotationSchema', () => {
    it('should validate text classification annotation', () => {
      const validAnnotation = {
        itemId: 'item123',
        data: { labels: ['positive'] },
      }

      const result = CreateAnnotationSchema.safeParse(validAnnotation)
      expect(result.success).toBe(true)
    })

    it('should validate text span annotation', () => {
      const validAnnotation = {
        itemId: 'item123',
        data: {
          spans: [{ start: 0, end: 10, label: 'PERSON' }],
        },
      }

      const result = CreateAnnotationSchema.safeParse(validAnnotation)
      expect(result.success).toBe(true)
    })

    it('should validate with annotator ID', () => {
      const validAnnotation = {
        itemId: 'item123',
        data: { labels: ['positive'] },
        annotatorId: 'annotator123',
      }

      const result = CreateAnnotationSchema.safeParse(validAnnotation)
      expect(result.success).toBe(true)
    })

    it('should reject missing itemId', () => {
      const invalidAnnotation = {
        data: { labels: ['positive'] },
      }

      const result = CreateAnnotationSchema.safeParse(invalidAnnotation)
      expect(result.success).toBe(false)
    })

    it('should reject empty itemId', () => {
      const invalidAnnotation = {
        itemId: '',
        data: { labels: ['positive'] },
      }

      const result = CreateAnnotationSchema.safeParse(invalidAnnotation)
      expect(result.success).toBe(false)
    })
  })
})
