import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/annotations/export - Export annotations as JSONL
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params

    // Get project to know the task type
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get all annotations with their items
    const annotations = await prisma.annotation.findMany({
      where: { projectId },
      include: {
        item: true,
        annotator: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Format for LLM fine-tuning (OpenAI format)
    const exportData = annotations.map(annotation => {
      const data = JSON.parse(annotation.dataJson)
      const item = annotation.item

      let formatted: any = {
        input: item.inputText,
        annotation: data,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          taskType: project.taskType,
          itemId: item.id,
          annotationId: annotation.id,
          annotatedAt: annotation.createdAt.toISOString()
        }
      }

      // Add annotator info if available
      if (annotation.annotator) {
        formatted.metadata.annotator = {
          id: annotation.annotator.id,
          name: annotation.annotator.name,
          externalUserId: annotation.annotator.externalUserId
        }
      }

      // Add input metadata if available
      if (item.inputMetaJson) {
        try {
          formatted.metadata.inputMeta = JSON.parse(item.inputMetaJson)
        } catch (e) {
          // ignore parse errors
        }
      }

      return formatted
    })

    // Convert to JSONL format
    const jsonl = exportData.map(item => JSON.stringify(item)).join('\n')

    return new NextResponse(jsonl, {
      headers: {
        'Content-Type': 'application/jsonl',
        'Content-Disposition': `attachment; filename="${project.name}-annotations-${Date.now()}.jsonl"`
      }
    })
  } catch (error) {
    console.error('Error exporting annotations:', error)
    return NextResponse.json({ error: 'Failed to export annotations' }, { status: 500 })
  }
}
