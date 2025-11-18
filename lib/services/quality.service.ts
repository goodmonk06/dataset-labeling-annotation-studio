/**
 * Quality metrics and inter-annotator agreement calculations
 */

import { prisma } from '../prisma'
import { InterAnnotatorAgreement, QualityReport } from '../domain/types'

export class QualityService {
  /**
   * Calculate inter-annotator agreement for an item
   * using percentage agreement (simple method)
   */
  async calculateSimpleAgreement(itemId: string): Promise<InterAnnotatorAgreement | null> {
    const annotations = await prisma.annotation.findMany({
      where: { itemId },
      include: { annotator: true },
    })

    if (annotations.length < 2) {
      return null // Need at least 2 annotations
    }

    const annotatorIds = annotations
      .map((a) => a.annotatorId)
      .filter((id): id is string => id !== null)

    // Parse annotation data
    const annotationData = annotations.map((a) => JSON.parse(a.dataJson))

    // For text classification: compare labels
    if (annotationData[0].labels) {
      const labelSets = annotationData.map((d) =>
        new Set(d.labels || [])
      )

      let agreements = 0
      let total = 0

      // Pairwise comparison
      for (let i = 0; i < labelSets.length; i++) {
        for (let j = i + 1; j < labelSets.length; j++) {
          total++
          // Check if sets are equal
          const set1 = labelSets[i]
          const set2 = labelSets[j]
          if (
            set1.size === set2.size &&
            [...set1].every((label) => set2.has(label))
          ) {
            agreements++
          }
        }
      }

      return {
        itemId,
        annotators: annotatorIds,
        agreementScore: total > 0 ? agreements / total : 0,
        method: 'percentage_agreement',
        details: {
          totalComparisons: total,
          agreements,
          disagreements: total - agreements,
        },
      }
    }

    // For span labeling: calculate overlap
    // (Simplified - production would use proper token-level agreement)
    if (annotationData[0].spans) {
      // TODO: Implement span overlap calculation
      return null
    }

    return null
  }

  /**
   * Generate quality report for a project
   */
  async generateQualityReport(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<QualityReport> {
    const where: any = {
      projectId,
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    }

    const annotations = await prisma.annotation.findMany({
      where,
      include: {
        annotator: true,
        reviews: true,
      },
    })

    // Calculate metrics
    const totalAnnotations = annotations.length
    const confidences = annotations
      .map((a) => a.confidence)
      .filter((c): c is number => c !== null)
    const averageConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
        : 0

    const times = annotations
      .map((a) => a.timeSpentMs)
      .filter((t): t is number => t !== null)
    const averageTimeMs =
      times.length > 0
        ? times.reduce((sum, t) => sum + t, 0) / times.length
        : 0

    // Review acceptance rate
    const reviewedAnnotations = annotations.filter((a) => a.reviews.length > 0)
    const approvedAnnotations = reviewedAnnotations.filter((a) =>
      a.reviews.some((r) => r.status === 'approved')
    )
    const reviewAcceptanceRate =
      reviewedAnnotations.length > 0
        ? approvedAnnotations.length / reviewedAnnotations.length
        : 0

    // Annotator performance
    const annotatorMap = new Map<string, {
      count: number
      confidences: number[]
      times: number[]
    }>()

    annotations.forEach((annotation) => {
      if (!annotation.annotatorId) return

      if (!annotatorMap.has(annotation.annotatorId)) {
        annotatorMap.set(annotation.annotatorId, {
          count: 0,
          confidences: [],
          times: [],
        })
      }

      const data = annotatorMap.get(annotation.annotatorId)!
      data.count++
      if (annotation.confidence !== null) {
        data.confidences.push(annotation.confidence)
      }
      if (annotation.timeSpentMs !== null) {
        data.times.push(annotation.timeSpentMs)
      }
    })

    const annotatorPerformance = Array.from(annotatorMap.entries()).map(
      ([annotatorId, data]) => {
        const annotator = annotations.find(
          (a) => a.annotatorId === annotatorId
        )?.annotator

        return {
          annotatorId,
          annotatorName: annotator?.name || undefined,
          count: data.count,
          avgConfidence:
            data.confidences.length > 0
              ? data.confidences.reduce((sum, c) => sum + c, 0) /
                data.confidences.length
              : 0,
          avgTimeMs:
            data.times.length > 0
              ? data.times.reduce((sum, t) => sum + t, 0) / data.times.length
              : 0,
        }
      }
    )

    return {
      projectId,
      period: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
      metrics: {
        totalAnnotations,
        averageConfidence,
        averageTimeMs,
        reviewAcceptanceRate,
      },
      annotatorPerformance,
    }
  }

  /**
   * Calculate Cohen's Kappa for two annotators
   * (More sophisticated agreement metric)
   */
  async calculateCohensKappa(
    itemIds: string[],
    annotator1Id: string,
    annotator2Id: string
  ): Promise<number> {
    // TODO: Implement Cohen's Kappa calculation
    // This requires category-level agreement matrix
    return 0
  }
}

export const qualityService = new QualityService()
