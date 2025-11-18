import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/items - Get all items for a project
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const items = await prisma.item.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { annotations: true }
        }
      }
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

// POST /api/projects/[id]/items - Create a new item
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const { inputText, inputMeta } = body

    const item = await prisma.item.create({
      data: {
        projectId: id,
        inputText,
        inputMetaJson: inputMeta ? JSON.stringify(inputMeta) : null
      }
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
