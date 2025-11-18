/**
 * Domain types and interfaces
 * These represent the core business concepts independent of infrastructure
 */

import {
  TaskType,
  ProjectStatus,
  ItemStatus,
  ItemPriority,
  ReviewStatus,
  AnnotatorRole,
} from '@prisma/client'

// Core domain types
export type {
  TaskType,
  ProjectStatus,
  ItemStatus,
  ItemPriority,
  ReviewStatus,
  AnnotatorRole,
}

// Value Objects
export interface AnnotationData {
  labels?: string[]
  spans?: Array<{
    start: number
    end: number
    label: string
  }>
  confidence?: number
  [key: string]: any
}

export interface ProjectMetadata {
  allowMultipleAnnotations?: boolean
  requireReview?: boolean
  minAnnotationsPerItem?: number
  maxAnnotationsPerItem?: number
  customFields?: Record<string, any>
}

export interface ItemMetadata {
  source?: string
  sourceUrl?: string
  category?: string
  tags?: string[]
  [key: string]: any
}

export interface AnnotatorStats {
  totalAnnotations: number
  totalTimeMs: number
  averageTimeMs: number
  accuracyScore?: number
  throughputPerDay?: number
  lastActiveAt?: string
}

export interface AnnotatorPreferences {
  theme?: 'light' | 'dark'
  keyboardShortcuts?: Record<string, string>
  notificationSettings?: {
    email?: boolean
    inApp?: boolean
  }
}

// Aggregates
export interface ProjectWithStats {
  id: string
  name: string
  description?: string | null
  taskType: TaskType
  status: ProjectStatus
  labels: string[]
  stats: {
    totalItems: number
    annotatedItems: number
    pendingItems: number
    totalAnnotations: number
    averageAnnotationsPerItem: number
    progress: number // 0-100
  }
  createdAt: Date
  updatedAt: Date
}

export interface ItemWithAnnotations {
  id: string
  projectId: string
  inputText?: string | null
  inputMeta?: ItemMetadata | null
  status: ItemStatus
  priority: ItemPriority
  difficulty?: number | null
  annotations: Array<{
    id: string
    annotatorId?: string | null
    annotatorName?: string | null
    data: AnnotationData
    confidence?: number | null
    timeSpentMs?: number | null
    createdAt: Date
  }>
  createdAt: Date
}

export interface AnnotationWithReview {
  id: string
  itemId: string
  annotatorId?: string | null
  data: AnnotationData
  confidence?: number | null
  timeSpentMs?: number | null
  reviews: Array<{
    id: string
    reviewerId: string
    reviewerName?: string | null
    status: ReviewStatus
    feedback?: string | null
    createdAt: Date
  }>
  createdAt: Date
}

// Quality Metrics
export interface InterAnnotatorAgreement {
  itemId: string
  annotators: string[]
  agreementScore: number // 0-1 (e.g., Cohen's Kappa, Fleiss' Kappa)
  method: 'cohens_kappa' | 'fleiss_kappa' | 'percentage_agreement'
  details: {
    totalComparisons: number
    agreements: number
    disagreements: number
  }
}

export interface QualityReport {
  projectId: string
  period: {
    start: Date
    end: Date
  }
  metrics: {
    totalAnnotations: number
    averageConfidence: number
    averageTimeMs: number
    iaaScore?: number // Inter-Annotator Agreement
    reviewAcceptanceRate: number
  }
  annotatorPerformance: Array<{
    annotatorId: string
    annotatorName?: string
    count: number
    avgConfidence: number
    avgTimeMs: number
    accuracy?: number
  }>
}

// Batch Operations
export interface BatchAssignment {
  batchId: string
  itemIds: string[]
  annotatorIds: string[]
  dueDate?: Date
}

export interface BatchProgress {
  batchId: string
  totalItems: number
  completedItems: number
  inProgressItems: number
  pendingItems: number
  progress: number // 0-100
  estimatedCompletionDate?: Date
}
