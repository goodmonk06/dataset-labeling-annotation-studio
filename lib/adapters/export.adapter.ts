/**
 * Export adapter interface
 * Abstracts export formats for different ML platforms
 */

import { AnnotationData, ItemMetadata } from '../domain/types'

export interface ExportRecord {
  input: string | null
  annotation: AnnotationData
  metadata: {
    projectId: string
    projectName: string
    taskType: string
    itemId: string
    annotationId: string
    annotatedAt: string
    annotatorId?: string
    inputMeta?: ItemMetadata
    [key: string]: any
  }
}

export interface ExportOptions {
  format?: string
  includeMetadata?: boolean
  filter?: {
    startDate?: Date
    endDate?: Date
    annotatorIds?: string[]
    status?: string[]
  }
}

export interface ExportResult {
  data: string
  contentType: string
  filename: string
}

export interface ExportAdapter {
  /**
   * Export annotations in the adapter's format
   */
  export(
    records: ExportRecord[],
    options?: ExportOptions
  ): Promise<ExportResult>

  /**
   * Get the format name
   */
  getFormatName(): string

  /**
   * Get format description
   */
  getDescription(): string
}

/**
 * JSONL export adapter (default)
 */
export class JSONLExportAdapter implements ExportAdapter {
  async export(
    records: ExportRecord[],
    options?: ExportOptions
  ): Promise<ExportResult> {
    const lines = records.map((record) => JSON.stringify(record))
    const data = lines.join('\n')

    return {
      data,
      contentType: 'application/jsonl',
      filename: `annotations-${Date.now()}.jsonl`,
    }
  }

  getFormatName(): string {
    return 'JSONL'
  }

  getDescription(): string {
    return 'JSON Lines format - one JSON object per line'
  }
}

/**
 * OpenAI fine-tuning export adapter
 */
export class OpenAIExportAdapter implements ExportAdapter {
  async export(
    records: ExportRecord[],
    options?: ExportOptions
  ): Promise<ExportResult> {
    const formatted = records.map((record) => {
      const { annotation, input, metadata } = record

      // For text classification
      if (annotation.labels) {
        return {
          messages: [
            {
              role: 'system',
              content: 'You are a helpful classifier.',
            },
            {
              role: 'user',
              content: input || '',
            },
            {
              role: 'assistant',
              content: annotation.labels.join(', '),
            },
          ],
        }
      }

      // For NER/span labeling
      if (annotation.spans) {
        const entities = annotation.spans
          .map((span) => `${input?.substring(span.start, span.end)}: ${span.label}`)
          .join(', ')

        return {
          messages: [
            {
              role: 'system',
              content: 'You are a named entity recognition system.',
            },
            {
              role: 'user',
              content: input || '',
            },
            {
              role: 'assistant',
              content: entities,
            },
          ],
        }
      }

      return null
    }).filter(Boolean)

    const data = formatted.map((item) => JSON.stringify(item)).join('\n')

    return {
      data,
      contentType: 'application/jsonl',
      filename: `openai-finetune-${Date.now()}.jsonl`,
    }
  }

  getFormatName(): string {
    return 'OpenAI Fine-tuning'
  }

  getDescription(): string {
    return 'OpenAI fine-tuning format with messages array'
  }
}

/**
 * Hugging Face datasets export adapter
 */
export class HuggingFaceExportAdapter implements ExportAdapter {
  async export(
    records: ExportRecord[],
    options?: ExportOptions
  ): Promise<ExportResult> {
    const formatted = records.map((record) => {
      const { annotation, input } = record

      // For text classification
      if (annotation.labels && annotation.labels.length > 0) {
        return {
          text: input,
          label: annotation.labels[0], // Primary label
          labels: annotation.labels, // All labels
        }
      }

      // For NER
      if (annotation.spans) {
        const tokens = input?.split(' ') || []
        const nerTags = new Array(tokens.length).fill('O')

        annotation.spans.forEach((span) => {
          // Simple tokenization - in production, use proper tokenizer
          const text = input?.substring(span.start, span.end) || ''
          const tokenIndex = tokens.findIndex((t) => text.includes(t))
          if (tokenIndex !== -1) {
            nerTags[tokenIndex] = `B-${span.label}`
          }
        })

        return {
          tokens,
          ner_tags: nerTags,
        }
      }

      return null
    }).filter(Boolean)

    const data = formatted.map((item) => JSON.stringify(item)).join('\n')

    return {
      data,
      contentType: 'application/jsonl',
      filename: `huggingface-dataset-${Date.now()}.jsonl`,
    }
  }

  getFormatName(): string {
    return 'Hugging Face'
  }

  getDescription(): string {
    return 'Hugging Face datasets compatible format'
  }
}

/**
 * spaCy training export adapter
 */
export class SpacyExportAdapter implements ExportAdapter {
  async export(
    records: ExportRecord[],
    options?: ExportOptions
  ): Promise<ExportResult> {
    const formatted = records.map((record) => {
      const { annotation, input } = record

      if (annotation.spans) {
        return [
          input,
          {
            entities: annotation.spans.map((span) => [
              span.start,
              span.end,
              span.label,
            ]),
          },
        ]
      }

      return null
    }).filter(Boolean)

    const data = JSON.stringify(formatted, null, 2)

    return {
      data,
      contentType: 'application/json',
      filename: `spacy-training-${Date.now()}.json`,
    }
  }

  getFormatName(): string {
    return 'spaCy'
  }

  getDescription(): string {
    return 'spaCy training data format'
  }
}

/**
 * Export adapter registry
 */
export class ExportAdapterRegistry {
  private adapters: Map<string, ExportAdapter> = new Map()

  constructor() {
    // Register default adapters
    this.register('jsonl', new JSONLExportAdapter())
    this.register('openai', new OpenAIExportAdapter())
    this.register('huggingface', new HuggingFaceExportAdapter())
    this.register('spacy', new SpacyExportAdapter())
  }

  register(name: string, adapter: ExportAdapter): void {
    this.adapters.set(name, adapter)
  }

  get(name: string): ExportAdapter | undefined {
    return this.adapters.get(name)
  }

  list(): Array<{ name: string; description: string }> {
    return Array.from(this.adapters.entries()).map(([name, adapter]) => ({
      name,
      description: adapter.getDescription(),
    }))
  }
}
