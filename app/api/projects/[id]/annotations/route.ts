import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/annotations - Get all annotations for a project
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    const where: any = { projectId: id }
    if (itemId) {
      where.itemId = itemId
    }

    const annotations = await prisma.annotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        item: true,
        annotator: true
      }
    })

    return NextResponse.json(annotations)
  } catch (error) {
    console.error('Error fetching annotations:', error)
    return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 })
  }
}

// POST /api/projects/[id]/annotations - Create a new annotation
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { itemId, data, annotatorId } = body

    if (!itemId || !data) {
      return NextResponse.json(
        { error: 'itemId and data are required' },
        { status: 400 }
      )
    }

    const annotation = await prisma.annotation.create({
      data: {
        projectId,
        itemId,
        annotatorId: annotatorId || null,
        dataJson: JSON.stringify(data)
      }
    })

    return NextResponse.json(annotation, { status: 201 })
  } catch (error) {
    console.error('Error creating annotation:', error)
    return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 })
  }
}
