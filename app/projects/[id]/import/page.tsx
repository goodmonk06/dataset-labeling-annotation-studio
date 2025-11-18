'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id
  const router = useRouter()

  const [jsonlText, setJsonlText] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  const handleImport = async () => {
    setError('')
    setImporting(true)

    try {
      // Parse JSONL
      const lines = jsonlText.trim().split('\n').filter(line => line.trim())
      const items = lines.map((line, idx) => {
        try {
          return JSON.parse(line)
        } catch (e) {
          throw new Error(`Invalid JSON on line ${idx + 1}`)
        }
      })

      if (items.length === 0) {
        throw new Error('No items to import')
      }

      // Send to API
      const res = await fetch(`/api/projects/${projectId}/items/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to import')
      }

      const result = await res.json()
      alert(`Successfully imported ${result.count} items!`)
      router.push(`/projects/${projectId}/annotate`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const loadExample = () => {
    const example = [
      { inputText: "This is a great product! I love it.", inputMeta: { source: "review" } },
      { inputText: "Terrible experience, would not recommend.", inputMeta: { source: "review" } },
      { inputText: "It's okay, nothing special.", inputMeta: { source: "review" } },
    ]
    setJsonlText(example.map(item => JSON.stringify(item)).join('\n'))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/projects" className="text-blue-600 hover:underline text-sm">
            ← Back to Projects
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Import Items</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold">JSONL Format</h2>
              <button
                onClick={loadExample}
                className="text-sm text-blue-600 hover:underline"
              >
                Load Example
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Paste your JSONL data below. Each line should be a valid JSON object with either{' '}
              <code className="bg-gray-100 px-1 rounded">inputText</code> or{' '}
              <code className="bg-gray-100 px-1 rounded">text</code> field.
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono mb-4">
              {'{"inputText": "Your text here", "inputMeta": {"key": "value"}}'}<br />
              {'{"inputText": "Another text"}'}<br />
              {'{"text": "Also works with text field"}'}
            </div>
          </div>

          <textarea
            value={jsonlText}
            onChange={(e) => setJsonlText(e.target.value)}
            className="w-full h-96 border border-gray-300 rounded p-4 font-mono text-sm"
            placeholder="Paste JSONL here..."
          />

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              Error: {error}
            </div>
          )}

          <div className="mt-6 flex gap-3 justify-end">
            <Link
              href={`/projects/${projectId}/annotate`}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Cancel
            </Link>
            <button
              onClick={handleImport}
              disabled={!jsonlText.trim() || importing}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : 'Import Items'}
            </button>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Each line must be a separate JSON object (JSONL format)</li>
            <li>Use <code className="bg-blue-100 px-1 rounded">inputText</code> or <code className="bg-blue-100 px-1 rounded">text</code> field for the text content</li>
            <li>Optional: Include <code className="bg-blue-100 px-1 rounded">inputMeta</code> or <code className="bg-blue-100 px-1 rounded">meta</code> for additional metadata</li>
            <li>The import will validate all lines before creating items</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
