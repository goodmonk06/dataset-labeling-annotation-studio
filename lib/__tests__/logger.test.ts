import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Logger, LogLevel } from '../logger'

describe('Logger', () => {
  let consoleSpy: any

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('Log Levels', () => {
    it('should log info messages', () => {
      const logger = new Logger({}, LogLevel.INFO)
      logger.info('Test message', { userId: '123' })

      expect(consoleSpy).toHaveBeenCalled()
      const call = consoleSpy.mock.calls[0]
      expect(call[0]).toContain('[INFO]')
      expect(call[0]).toContain('Test message')
    })

    it('should not log debug when min level is INFO', () => {
      const logger = new Logger({}, LogLevel.INFO)
      logger.debug('Debug message')

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log debug when min level is DEBUG', () => {
      const logger = new Logger({}, LogLevel.DEBUG)
      logger.debug('Debug message')

      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should always log error messages', () => {
      const logger = new Logger({}, LogLevel.ERROR)
      logger.error('Error message', new Error('Test error'))

      expect(consoleSpy).toHaveBeenCalled()
      const call = consoleSpy.mock.calls[0]
      expect(call[0]).toContain('[ERROR]')
      expect(call[0]).toContain('Error message')
    })
  })

  describe('Context', () => {
    it('should include default context', () => {
      const logger = new Logger({ requestId: 'req-123' }, LogLevel.INFO)
      logger.info('Test')

      expect(consoleSpy).toHaveBeenCalled()
      const call = consoleSpy.mock.calls[0]
      expect(call[1]).toEqual({ requestId: 'req-123' })
    })

    it('should merge additional context', () => {
      const logger = new Logger({ requestId: 'req-123' }, LogLevel.INFO)
      logger.info('Test', { userId: 'user-456' })

      const call = consoleSpy.mock.calls[0]
      expect(call[1]).toEqual({ requestId: 'req-123', userId: 'user-456' })
    })

    it('should create child logger with additional context', () => {
      const parent = new Logger({ service: 'api' }, LogLevel.INFO)
      const child = parent.child({ module: 'auth' })

      child.info('Test')

      const call = consoleSpy.mock.calls[0]
      expect(call[1]).toEqual({ service: 'api', module: 'auth' })
    })
  })

  describe('Error Logging', () => {
    it('should include error details', () => {
      const logger = new Logger({}, LogLevel.INFO)
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n  at test.ts:10'

      logger.error('Operation failed', error)

      expect(consoleSpy).toHaveBeenCalled()
      const call = consoleSpy.mock.calls[0]
      expect(call[2]).toHaveProperty('name', 'Error')
      expect(call[2]).toHaveProperty('message', 'Test error')
      expect(call[2]).toHaveProperty('stack')
    })
  })
})
