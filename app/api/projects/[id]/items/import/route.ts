import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = {
  params: Promise<{ id: string }>
}

// POST /api/projects/[id]/items/import - Bulk import items from JSONL
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { items } = body

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create items in bulk
    const createdItems = await prisma.item.createMany({
      data: items.map((item: any) => ({
        projectId,
        inputText: item.inputText || item.text || null,
        inputMetaJson: item.inputMeta || item.meta ? JSON.stringify(item.inputMeta || item.meta) : null
      }))
    })

    return NextResponse.json({
      success: true,
      count: createdItems.count
    }, { status: 201 })
  } catch (error) {
    console.error('Error importing items:', error)
    return NextResponse.json({ error: 'Failed to import items' }, { status: 500 })
  }
}
