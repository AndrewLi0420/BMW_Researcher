import { useState, useEffect } from 'react'

const SEGMENTS = [
  'Raw Materials',
  'Battery Grade Materials',
  'Anodes',
  'Cathodes',
  'Electrolytes',
  'Separators',
  'Other Cell Components',
  'Cell Manufacturing',
  'Module & Pack Assembly',
  'BMS & Electronics',
  'Stationary Storage',
  'EV Integration',
  'Recycling',
  'Equipment & Machinery',
  'Research & Testing',
]

export default function App() {
  const [segment, setSegment] = useState(SEGMENTS[0])
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleRun() {
    setStatus('running')
    setResult(null)
    setErrorMsg('')

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Pipeline failed.')
      }

      const data = await res.json()
      setResult(data)
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  function handleDownload() {
    const encoded = encodeURIComponent(segment)
    window.location.href = `/api/download-csv?segment=${encoded}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* BMW roundel — simple SVG */}
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="48" stroke="#1c69d4" strokeWidth="4" fill="white"/>
              <circle cx="50" cy="50" r="36" fill="#1c69d4"/>
              <path d="M50 14 L50 50 L86 50 A36 36 0 0 0 50 14Z" fill="white"/>
              <path d="M50 50 L50 86 A36 36 0 0 0 86 50 L50 50Z" fill="#1c69d4"/>
              <path d="M14 50 L50 50 L50 14 A36 36 0 0 0 14 50Z" fill="#1c69d4"/>
              <path d="M50 50 L14 50 A36 36 0 0 0 50 86 L50 50Z" fill="white"/>
            </svg>
            <span className="text-xl font-semibold tracking-tight text-gray-900">BMW Group</span>
          </div>
          <span className="text-sm text-gray-400 tracking-widest uppercase">Battery Intelligence</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          {/* Hero text */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome, BMW
            </h1>
            <p className="text-gray-500 text-base">
              Battery supply chain data, powered by Gemini AI.
              <br />
              Select a segment below and run the pipeline to fetch the latest facilities.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {/* Segment selector */}
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Supply Chain Segment
            </label>
            <select
              value={segment}
              onChange={(e) => {
                setSegment(e.target.value)
                setStatus('idle')
                setResult(null)
              }}
              disabled={status === 'running'}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 text-sm
                         focus:outline-none focus:ring-2 focus:ring-bmw-blue focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {SEGMENTS.map((seg) => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>

            {/* Run button */}
            <button
              onClick={handleRun}
              disabled={status === 'running'}
              className="w-full rounded-lg bg-bmw-blue hover:bg-bmw-dark text-white font-semibold
                         py-3 px-6 text-sm transition-colors duration-150
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'running' ? (
                <>
                  <Spinner />
                  Running pipeline…
                </>
              ) : (
                'Run Pipeline'
              )}
            </button>

            {/* Result area */}
            {status === 'done' && result && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-gray-700 text-sm mb-4">
                  Found{' '}
                  <span className="font-bold text-gray-900">{result.facilities_found}</span>{' '}
                  {result.facilities_found === 1 ? 'facility' : 'facilities'} for{' '}
                  <span className="font-medium text-bmw-blue">{result.segment}</span>.
                </p>
                <button
                  onClick={handleDownload}
                  className="w-full rounded-lg border border-bmw-blue text-bmw-blue hover:bg-blue-50
                             font-semibold py-3 px-6 text-sm transition-colors duration-150
                             flex items-center justify-center gap-2"
                >
                  <DownloadIcon />
                  Download CSV
                </button>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-red-600 text-sm">
                  {errorMsg || 'An error occurred. Check the server logs.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-gray-400">
            Data sourced via Gemini AI · North America focus (US, Canada, Mexico)
          </p>
        </div>
      </main>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}
