import { z } from 'zod'

// Task type enum
export const TaskTypeSchema = z.enum(['text_classification', 'text_span', 'image_tagging'])

// Project schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  taskType: TaskTypeSchema,
  labels: z.array(z.string()).min(1, 'At least one label is required'),
})

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  labels: z.array(z.string()).min(1).optional(),
})

// Item schemas
export const CreateItemSchema = z.object({
  inputText: z.string().optional(),
  inputMeta: z.any().optional(),
})

export const ImportItemsSchema = z.object({
  items: z.array(
    z.object({
      inputText: z.string().optional(),
      text: z.string().optional(),
      inputMeta: z.any().optional(),
      meta: z.any().optional(),
    })
  ).min(1, 'At least one item is required'),
})

// Annotation schemas
export const TextClassificationDataSchema = z.object({
  labels: z.array(z.string()).min(1, 'At least one label is required'),
})

export const TextSpanSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  label: z.string().min(1),
})

export const TextSpanDataSchema = z.object({
  spans: z.array(TextSpanSchema).min(1, 'At least one span is required'),
})

export const CreateAnnotationSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  data: z.union([TextClassificationDataSchema, TextSpanDataSchema]),
  annotatorId: z.string().optional(),
})

// Type exports
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>
export type CreateItemInput = z.infer<typeof CreateItemSchema>
export type ImportItemsInput = z.infer<typeof ImportItemsSchema>
export type CreateAnnotationInput = z.infer<typeof CreateAnnotationSchema>
export type TextClassificationData = z.infer<typeof TextClassificationDataSchema>
export type TextSpanData = z.infer<typeof TextSpanDataSchema>
