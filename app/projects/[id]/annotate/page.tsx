'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'

type Project = {
  id: string
  name: string
  taskType: string
  labelsJson: string
}

type Item = {
  id: string
  inputText: string | null
  inputMetaJson: string | null
  _count: { annotations: number }
}

type Annotation = {
  id: string
  dataJson: string
  createdAt: string
}

type TextSpan = {
  start: number
  end: number
  label: string
}

export default function AnnotatePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id

  const [project, setProject] = useState<Project | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [labels, setLabels] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Text classification state
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])

  // Text span state
  const [spans, setSpans] = useState<TextSpan[]>([])
  const [selectedText, setSelectedText] = useState<{ start: number; end: number } | null>(null)
  const [spanLabel, setSpanLabel] = useState<string>('')

  // Annotations history
  const [annotations, setAnnotations] = useState<Annotation[]>([])

  useEffect(() => {
    fetchProject()
    fetchItems()
  }, [projectId])

  useEffect(() => {
    if (items.length > 0) {
      fetchAnnotations(items[currentIndex].id)
    }
  }, [currentIndex, items])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Navigate items
      if (e.key === 'ArrowRight' || e.key === 'n') {
        e.preventDefault()
        nextItem()
      } else if (e.key === 'ArrowLeft' || e.key === 'p') {
        e.preventDefault()
        previousItem()
      }

      // Number keys for labels (1-9)
      if (project?.taskType === 'text_classification') {
        const num = parseInt(e.key)
        if (!isNaN(num) && num >= 1 && num <= labels.length) {
          e.preventDefault()
          toggleLabel(labels[num - 1])
        }
      }

      // Submit annotation (Enter or s)
      if (e.key === 'Enter' || e.key === 's') {
        if (project?.taskType === 'text_classification' && selectedLabels.length > 0) {
          e.preventDefault()
          submitAnnotation()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [project, labels, selectedLabels, currentIndex, items, spans])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      const data = await res.json()
      setProject(data)
      setLabels(JSON.parse(data.labelsJson))
    } catch (error) {
      console.error('Error fetching project:', error)
    }
  }

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/items`)
      const data = await res.json()
      setItems(data)
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnnotations = async (itemId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/annotations?itemId=${itemId}`)
      const data = await res.json()
      setAnnotations(data)

      // Reset state for new item
      setSelectedLabels([])
      setSpans([])
      setSelectedText(null)
    } catch (error) {
      console.error('Error fetching annotations:', error)
    }
  }

  const nextItem = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const previousItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const textContent = items[currentIndex]?.inputText || ''

    // Get the container element
    const container = document.getElementById('annotation-text')
    if (!container) return

    // Calculate character offsets
    const preSelectionRange = range.cloneRange()
    preSelectionRange.selectNodeContents(container)
    preSelectionRange.setEnd(range.startContainer, range.startOffset)
    const start = preSelectionRange.toString().length

    const end = start + range.toString().length

    if (start !== end) {
      setSelectedText({ start, end })
    }
  }

  const addSpan = () => {
    if (!selectedText || !spanLabel) return

    setSpans(prev => [...prev, {
      start: selectedText.start,
      end: selectedText.end,
      label: spanLabel
    }])
    setSelectedText(null)
    setSpanLabel('')
    window.getSelection()?.removeAllRanges()
  }

  const removeSpan = (index: number) => {
    setSpans(prev => prev.filter((_, i) => i !== index))
  }

  const submitAnnotation = async () => {
    if (!items[currentIndex]) return

    let data: any

    if (project?.taskType === 'text_classification') {
      if (selectedLabels.length === 0) return
      data = { labels: selectedLabels }
    } else if (project?.taskType === 'text_span') {
      if (spans.length === 0) return
      data = { spans }
    } else {
      return
    }

    try {
      await fetch(`/api/projects/${projectId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: items[currentIndex].id,
          data
        })
      })

      // Move to next item after successful annotation
      if (currentIndex < items.length - 1) {
        nextItem()
      } else {
        // Refresh to show updated count
        fetchItems()
      }
    } catch (error) {
      console.error('Error submitting annotation:', error)
      alert('Failed to submit annotation')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!project || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No items to annotate</p>
          <Link href="/projects" className="text-blue-600 hover:underline">
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  const currentItem = items[currentIndex]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href="/projects" className="text-blue-600 hover:underline text-sm">
              ← Back to Projects
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{project.name}</h1>
            <p className="text-sm text-gray-600">
              {project.taskType.replace('_', ' ')} • Item {currentIndex + 1} of {items.length}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Progress: {items.filter(i => i._count.annotations > 0).length} / {items.length} annotated
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Content to annotate */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Content</h2>
              <div
                id="annotation-text"
                className="text-lg leading-relaxed p-4 bg-gray-50 rounded border border-gray-200 select-text"
                onMouseUp={project.taskType === 'text_span' ? handleTextSelection : undefined}
              >
                {currentItem.inputText || 'No text available'}
              </div>

              {project.taskType === 'text_span' && spans.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Spans:</h3>
                  <div className="space-y-2">
                    {spans.map((span, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <div>
                          <span className="font-mono text-sm">
                            "{currentItem.inputText?.substring(span.start, span.end)}"
                          </span>
                          <span className="ml-2 px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs">
                            {span.label}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSpan(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-4 flex justify-between">
              <button
                onClick={previousItem}
                disabled={currentIndex === 0}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous (p)
              </button>
              <button
                onClick={nextItem}
                disabled={currentIndex === items.length - 1}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next (n) →
              </button>
            </div>
          </div>

          {/* Right: Annotation controls */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Annotation</h2>

              {project.taskType === 'text_classification' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Select one or more labels:</p>
                  <div className="space-y-2">
                    {labels.map((label, idx) => (
                      <button
                        key={label}
                        onClick={() => toggleLabel(label)}
                        className={`w-full text-left px-4 py-2 rounded border-2 transition-colors ${
                          selectedLabels.includes(label)
                            ? 'bg-blue-100 border-blue-500 text-blue-900'
                            : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <span className="text-xs text-gray-500 mr-2">[{idx + 1}]</span>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={submitAnnotation}
                    disabled={selectedLabels.length === 0}
                    className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Submit (Enter)
                  </button>
                </div>
              )}

              {project.taskType === 'text_span' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Select text and add label:</p>
                  {selectedText && (
                    <div className="mb-4 p-3 bg-blue-50 rounded">
                      <p className="text-sm font-semibold mb-2">Selected text:</p>
                      <p className="text-sm mb-3">
                        "{currentItem.inputText?.substring(selectedText.start, selectedText.end)}"
                      </p>
                      <select
                        value={spanLabel}
                        onChange={(e) => setSpanLabel(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
                      >
                        <option value="">Choose label...</option>
                        {labels.map(label => (
                          <option key={label} value={label}>{label}</option>
                        ))}
                      </select>
                      <button
                        onClick={addSpan}
                        disabled={!spanLabel}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Add Span
                      </button>
                    </div>
                  )}
                  <button
                    onClick={submitAnnotation}
                    disabled={spans.length === 0}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Submit All Spans
                  </button>
                </div>
              )}

              {/* Keyboard shortcuts help */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-2">Keyboard Shortcuts</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>n / → : Next item</div>
                  <div>p / ← : Previous item</div>
                  {project.taskType === 'text_classification' && (
                    <>
                      <div>1-9 : Toggle labels</div>
                      <div>Enter : Submit</div>
                    </>
                  )}
                </div>
              </div>

              {/* Previous annotations */}
              {annotations.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold mb-2">Previous Annotations ({annotations.length})</h3>
                  <div className="text-xs text-gray-600 space-y-2 max-h-40 overflow-y-auto">
                    {annotations.map(ann => (
                      <div key={ann.id} className="p-2 bg-gray-50 rounded">
                        {JSON.stringify(JSON.parse(ann.dataJson), null, 2)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
