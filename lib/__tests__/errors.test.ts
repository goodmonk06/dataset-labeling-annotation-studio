import { describe, it, expect } from 'vitest'
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  handleError,
  createSuccessResponse,
} from '../errors'
import { ZodError, z } from 'zod'

describe('Error Handling', () => {
  describe('AppError', () => {
    it('should create an app error with status code', () => {
      const error = new AppError(400, 'Test error', 'TEST_CODE')
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
    })
  })

  describe('ValidationError', () => {
    it('should create a validation error', () => {
      const error = new ValidationError('Invalid input', { field: 'name' })
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.errors).toEqual({ field: 'name' })
    })
  })

  describe('NotFoundError', () => {
    it('should create a not found error', () => {
      const error = new NotFoundError('Project')
      expect(error.statusCode).toBe(404)
      expect(error.message).toBe('Project not found')
      expect(error.code).toBe('NOT_FOUND')
    })
  })

  describe('ConflictError', () => {
    it('should create a conflict error', () => {
      const error = new ConflictError('Resource already exists')
      expect(error.statusCode).toBe(409)
      expect(error.code).toBe('CONFLICT')
    })
  })

  describe('handleError', () => {
    it('should handle ZodError', () => {
      const schema = z.object({ name: z.string() })
      try {
        schema.parse({ name: 123 })
      } catch (error) {
        const response = handleError(error)
        expect(response.status).toBe(400)
      }
    })

    it('should handle AppError', () => {
      const error = new AppError(403, 'Forbidden', 'FORBIDDEN')
      const response = handleError(error)
      expect(response.status).toBe(403)
    })

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong')
      const response = handleError(error)
      expect(response.status).toBe(500)
    })
  })

  describe('createSuccessResponse', () => {
    it('should create success response with default status', async () => {
      const data = { id: '1', name: 'Test' }
      const response = createSuccessResponse(data)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json).toEqual({ success: true, data })
    })

    it('should create success response with custom status', async () => {
      const data = { id: '1' }
      const response = createSuccessResponse(data, 201)
      expect(response.status).toBe(201)

      const json = await response.json()
      expect(json).toEqual({ success: true, data })
    })
  })
})
