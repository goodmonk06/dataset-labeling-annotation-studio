'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'

type Project = {
  id: string
  name: string
  taskType: string
  labelsJson: string
  _count: {
    items: number
    annotations: number
  }
}

type Annotation = {
  id: string
  dataJson: string
  createdAt: string
  item: {
    id: string
    inputText: string | null
  }
}

type LabelStats = {
  label: string
  count: number
  percentage: number
}

export default function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id

  const [project, setProject] = useState<Project | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [labelStats, setLabelStats] = useState<LabelStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      // Fetch project
      const projectRes = await fetch(`/api/projects/${projectId}`)
      const projectData = await projectRes.json()
      setProject(projectData)

      // Fetch all annotations
      const annotationsRes = await fetch(`/api/projects/${projectId}/annotations`)
      const annotationsData = await annotationsRes.json()
      setAnnotations(annotationsData)

      // Calculate stats
      calculateStats(annotationsData, projectData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (annotations: Annotation[], project: Project) => {
    const labelCounts: { [key: string]: number } = {}

    annotations.forEach(ann => {
      const data = JSON.parse(ann.dataJson)

      if (project.taskType === 'text_classification') {
        // Count each label
        if (data.labels && Array.isArray(data.labels)) {
          data.labels.forEach((label: string) => {
            labelCounts[label] = (labelCounts[label] || 0) + 1
          })
        }
      } else if (project.taskType === 'text_span') {
        // Count span labels
        if (data.spans && Array.isArray(data.spans)) {
          data.spans.forEach((span: any) => {
            labelCounts[span.label] = (labelCounts[span.label] || 0) + 1
          })
        }
      }
    })

    const total = Object.values(labelCounts).reduce((sum, count) => sum + count, 0)

    const stats = Object.entries(labelCounts)
      .map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)

    setLabelStats(stats)
  }

  const exportAnnotations = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/annotations/export`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project?.name || 'annotations'}-export.jsonl`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting annotations:', error)
      alert('Failed to export annotations')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Project not found</p>
          <Link href="/projects" className="text-blue-600 hover:underline">
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  const annotatedItems = new Set(annotations.map(a => a.item.id)).size
  const coveragePercentage = project._count.items > 0
    ? (annotatedItems / project._count.items) * 100
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/projects" className="text-blue-600 hover:underline text-sm">
            ← Back to Projects
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{project.name} - Statistics</h1>
          <p className="text-sm text-gray-600">{project.taskType.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Items</div>
            <div className="text-3xl font-bold text-gray-900">{project._count.items}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Annotated Items</div>
            <div className="text-3xl font-bold text-gray-900">{annotatedItems}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Annotations</div>
            <div className="text-3xl font-bold text-gray-900">{annotations.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Coverage</div>
            <div className="text-3xl font-bold text-gray-900">{coveragePercentage.toFixed(1)}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Label distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Label Distribution</h2>
            {labelStats.length === 0 ? (
              <p className="text-gray-500">No annotations yet</p>
            ) : (
              <div className="space-y-3">
                {labelStats.map((stat) => (
                  <div key={stat.label}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-700">{stat.label}</span>
                      <span className="text-gray-600">
                        {stat.count} ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/projects/${projectId}/annotate`}
                className="block w-full text-center px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Continue Annotating
              </Link>
              <button
                onClick={exportAnnotations}
                disabled={annotations.length === 0}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export Annotations (JSONL)
              </button>
            </div>

            {/* Recent annotations */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold mb-3">Recent Annotations</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {annotations.slice(0, 10).map((ann) => {
                  const data = JSON.parse(ann.dataJson)
                  return (
                    <div key={ann.id} className="p-3 bg-gray-50 rounded text-sm">
                      <div className="font-mono text-xs text-gray-600 mb-1">
                        {ann.item.inputText?.substring(0, 60)}...
                      </div>
                      <div className="text-xs">
                        {project.taskType === 'text_classification' && data.labels && (
                          <div className="flex gap-1 flex-wrap">
                            {data.labels.map((label: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                        {project.taskType === 'text_span' && data.spans && (
                          <div>
                            {data.spans.length} span{data.spans.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
