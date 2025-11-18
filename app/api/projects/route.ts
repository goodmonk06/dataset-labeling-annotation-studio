import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateProjectSchema } from '@/lib/validations'
import { handleError, createSuccessResponse } from '@/lib/errors'

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true, annotations: true }
        }
      }
    })
    return NextResponse.json(projects)
  } catch (error) {
    return handleError(error)
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateProjectSchema.parse(body)

    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        taskType: validatedData.taskType,
        labelsJson: JSON.stringify(validatedData.labels)
      }
    })

    return createSuccessResponse(project, 201)
  } catch (error) {
    return handleError(error)
  }
}
