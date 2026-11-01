import { useState } from 'react'
import {
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

interface Source {
  source_id: string
  title: string
  url: string
  characters: number
}

interface InformationGap {
  title?: string
  description?: string
  importance?: string
  why_it_matters?: string
  source_ids?: string[]
  evidence?: { source_id: string; quote: string }[]
  gap?: string
  priority?: string
  related_source_ids?: string[]
  suggested_search?: string
}

interface Conflict {
  topic?: string
  description?: string
  source_ids?: string[]
}

interface OutdatedInformation {
  claim?: string
  reason?: string
  source_ids?: string[]
}

interface VerificationTask {
  task: string
  reason?: string
  priority?: string
  source_ids?: string[]
  related_source_ids?: string[]
}

interface Analysis {
  research_question?: string
  overall_summary?: string
  coverage_score?: number
  information_gaps?: InformationGap[]
  conflicts?: Conflict[]
  outdated_information?: OutdatedInformation[]
  verification_checklist?: VerificationTask[]
  limitations?: string[]
}

interface AnalysisResponse {
  status?: string
  analysis?: Analysis
  sources?: Source[]
  failed_sources?: { url: string; error: string }[]
}

interface TaskResponse {
  task_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  message?: string
  result?: AnalysisResponse
}

function App() {
  const [question, setQuestion] = useState('')
  const [urls, setUrls] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<AnalysisResponse | null>(null)

  const handleAnalyze = async () => {
    setMessage('')
    setResult(null)

    const sourceList = urls
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean)

    if (question.trim().length < 10) {
      setMessage('Please enter a research question with at least 10 characters.')
      return
    }

    if (sourceList.length < 2 || sourceList.length > 5) {
      setMessage('Please provide between two and five webpage URLs.')
      return
    }

    for (const url of sourceList) {
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Invalid URL')
        }
      } catch {
        setMessage(`Please enter a valid webpage URL: ${url}`)
        return
      }
    }

    setLoading(true)
    setMessage('Submitting your research request...')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          urls: sourceList,
        }),
      })

      const responseText = await response.text()
      let taskData: TaskResponse

      try {
        taskData = JSON.parse(responseText)
      } catch {
        throw new Error(`Invalid server response (HTTP ${response.status}).`)
      }

      if (!response.ok) {
        throw new Error(
          (taskData as unknown as { detail?: string }).detail ||
            `Request failed with HTTP ${response.status}.`,
        )
      }

      if (!taskData.task_id) {
        throw new Error('The server did not return an analysis task ID.')
      }

      // Check the background task every two seconds.
      const maxAttempts = 90

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000))

        const statusResponse = await fetch(
          `/api/analyze/${taskData.task_id}`,
          { headers: { Accept: 'application/json' } },
        )

        const statusText = await statusResponse.text()
        let statusData: TaskResponse

        try {
          statusData = JSON.parse(statusText)
        } catch {
          throw new Error('Invalid task status response from server.')
        }

        if (!statusResponse.ok) {
          throw new Error(
            `Could not check analysis status (HTTP ${statusResponse.status}).`,
          )
        }

        if (statusData.status === 'failed') {
          throw new Error(statusData.message || 'The analysis failed.')
        }

        if (statusData.status === 'completed') {
          if (!statusData.result?.analysis) {
            throw new Error('The task completed but no analysis was returned.')
          }

          setResult(statusData.result)
          setMessage('')
          return
        }

        setMessage(
          statusData.message || 'Analyzing your sources. Please wait...',
        )
      }

      throw new Error(
        'The analysis is taking longer than expected. Please try again.',
      )
    } catch (error) {
      console.error('Analysis request failed:', error)

      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  const analysis = result?.analysis

  const priorityStyle = (priority?: string) => {
    const value = priority?.toLowerCase()

    if (value === 'high') return 'bg-red-50 text-red-700'
    if (value === 'medium') return 'bg-amber-50 text-amber-700'

    return 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white p-6 lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Search size={23} />
          </div>

          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Digital Dark Spot
            </h1>
            <p className="text-xs text-slate-400">
              Research intelligence
            </p>
          </div>
        </div>

        <div className="mt-12">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 font-semibold text-indigo-700">
            <Search size={18} />
            Research analysis
          </div>
        </div>

        <div className="absolute bottom-7 left-6 right-6 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck size={18} className="text-green-600" />
            Evidence-based research
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Discover missing information and verify what your sources actually establish.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen lg:ml-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Workspace</span>
            <span>/</span>
            <span className="font-semibold text-slate-800">
              Research analysis
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            AI research platform
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          {/* Hero */}
          <section className="mb-9">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              <Sparkles size={14} />
              AI-powered information gap detection
            </div>

            <h2 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Don't just find information.
              <span className="block text-indigo-600">
                Discover what's missing.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              Analyze multiple sources, identify missing information,
              discover conflicting claims, and create a verification
              checklist using AI.
            </p>
          </section>

          {/* Statistics */}
          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Sources supported</p>
                <FileText size={19} className="text-indigo-600" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-slate-900">
                2–5
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Webpage URLs per analysis
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Analysis engine</p>
                <Sparkles size={19} className="text-indigo-600" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-slate-900">
                Gemini AI
              </p>
              <p className="mt-1 text-xs text-slate-400">
                AI-powered research analysis
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Research insights</p>
                <Search size={19} className="text-indigo-600" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-slate-900">
                5 areas
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Gaps, conflicts, freshness and more
              </p>
            </div>
          </section>

          {/* Research form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                Start a research analysis
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Enter your question and the webpages you want to compare.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Research question
              </label>

              <textarea
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value)
                  setMessage('')
                }}
                rows={3}
                placeholder="Example: What are the major challenges of electric vehicle adoption in India?"
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Source URLs
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                <textarea
                  value={urls}
                  onChange={(event) => {
                    setUrls(event.target.value)
                    setMessage('')
                  }}
                  rows={5}
                  placeholder={'https://example.com/article-one\nhttps://example.com/article-two\nhttps://example.com/article-three'}
                  className="w-full resize-y bg-transparent text-sm leading-7 outline-none placeholder:text-slate-400"
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Add at least two publicly accessible webpage URLs, one URL per line. Maximum five.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                Your submitted sources will be the basis of the analysis.
              </p>

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analyzing sources...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Analyze information gaps
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>

            {message && (
              <div className="mt-5 flex items-start gap-3 whitespace-pre-wrap break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 shrink-0" size={19} />
                <p>{message}</p>
              </div>
            )}
          </section>

          {/* Results */}
          {analysis ? (
            <section className="mt-8 space-y-6">
              {/* Summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-slate-900">
                    Research overview
                  </h3>

                  <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
                    Coverage: {analysis.coverage_score ?? 'N/A'}%
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {analysis.overall_summary || 'No summary was returned.'}
                </p>

                {analysis.research_question && (
                  <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    <strong>Research question:</strong>{' '}
                    {analysis.research_question}
                  </p>
                )}
              </div>

              {/* Information gaps */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                    <Search size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Information gaps
                    </h3>
                    <p className="text-xs text-slate-400">
                      Information not found in the submitted sources
                    </p>
                  </div>
                </div>

                {analysis.information_gaps?.length ? (
                  <div className="mt-5 space-y-4">
                    {analysis.information_gaps.map((gap, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-100 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="font-semibold text-slate-800">
                            {index + 1}. {gap.title || gap.gap || gap.description || 'Information gap'}
                          </h4>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(gap.importance || gap.priority)}`}
                          >
                            {gap.importance || gap.priority || 'Unspecified'} priority
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {gap.why_it_matters || gap.description || 'No additional explanation was provided.'}
                        </p>

                        <p className="mt-3 text-sm text-indigo-700">
                          <strong>Suggested research:</strong>{' '}
                          {gap.suggested_search || 'Research this missing topic using additional reliable sources.'}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          Sources: {(gap.source_ids || gap.related_source_ids)?.join(', ') || 'Not specified'}
                        </p>

                        {gap.evidence?.length ? (
                          <div className="mt-3 space-y-2">
                            {gap.evidence.map((item, evidenceIndex) => (
                              <blockquote
                                key={evidenceIndex}
                                className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"
                              >
                                <strong>{item.source_id}:</strong> "{item.quote}"
                              </blockquote>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">
                    No specific information gaps were identified.
                  </p>
                )}
              </div>

              {/* Conflicts */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-50 p-2 text-red-600">
                    <AlertCircle size={20} />
                  </div>
                  <h3 className="font-bold text-slate-900">
                    Conflicting information
                  </h3>
                </div>

                {analysis.conflicts?.length ? (
                  <div className="mt-5 space-y-4">
                    {analysis.conflicts.map((conflict, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-100 p-4"
                      >
                        <h4 className="font-semibold text-slate-800">
                          {conflict.topic || 'Conflicting claim'}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {conflict.description}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          Sources: {conflict.source_ids?.join(', ') || 'Not specified'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">
                    No conflicting claims were identified in the supplied evidence.
                  </p>
                )}
              </div>

              {/* Outdated information */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-50 p-2 text-orange-600">
                    <RefreshCw size={20} />
                  </div>
                  <h3 className="font-bold text-slate-900">
                    Potentially outdated information
                  </h3>
                </div>

                {analysis.outdated_information?.length ? (
                  <div className="mt-5 space-y-4">
                    {analysis.outdated_information.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-100 p-4"
                      >
                        <h4 className="font-semibold text-slate-800">
                          {item.claim}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.reason}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          Sources: {item.source_ids?.join(', ') || 'Not specified'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">
                    No potentially outdated claims were identified.
                  </p>
                )}
              </div>

              {/* Verification checklist */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-green-50 p-2 text-green-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <h3 className="font-bold text-slate-900">
                    Verification checklist
                  </h3>
                </div>

                {analysis.verification_checklist?.length ? (
                  <div className="mt-5 space-y-3">
                    {analysis.verification_checklist.map((task, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-xl bg-slate-50 p-4"
                      >
                        <CheckCircle2
                          size={19}
                          className="mt-0.5 shrink-0 text-green-600"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium leading-6 text-slate-700">
                            {task.task}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {task.priority || 'Unspecified'} priority · Sources: {(task.source_ids || task.related_source_ids)?.join(', ') || 'Not specified'}
                          </p>
                          {task.reason && (
                            <p className="mt-1 text-sm text-slate-500">
                              {task.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">
                    No verification tasks were returned.
                  </p>
                )}
              </div>

              {/* Sources */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-indigo-600" />
                  <h3 className="font-bold text-slate-900">
                    Analyzed sources
                  </h3>
                </div>

                {result?.sources?.length ? (
                  <div className="mt-5 space-y-3">
                    {result.sources.map((source) => (
                      <div
                        key={source.source_id}
                        className="rounded-xl bg-slate-50 p-4"
                      >
                        <p className="text-sm font-semibold text-slate-800">
                          {source.source_id} — {source.title}
                        </p>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block break-all text-xs text-indigo-600 hover:underline"
                        >
                          {source.url}
                        </a>
                        <p className="mt-2 text-xs text-slate-400">
                          {source.characters.toLocaleString()} characters extracted
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    No source details were returned.
                  </p>
                )}

                {result?.failed_sources?.length ? (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-800">
                      Some sources could not be processed
                    </p>
                    {result.failed_sources.map((source, index) => (
                      <p
                        key={index}
                        className="mt-2 break-all text-xs text-amber-700"
                      >
                        {source.url}: {source.error}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Limitations */}
              {analysis.limitations?.length ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="font-bold text-slate-800">
                    Analysis limitations
                  </h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                    {analysis.limitations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Search size={25} />
              </div>

              <h3 className="mt-5 text-base font-bold text-slate-800">
                Your research insights will appear here
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Submit your research question and sources to discover
                missing information, conflicting claims, and verification tasks.
              </p>
            </section>
          )}

          {/* Footer */}
          <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row">
            <p>Digital Dark Spot © 2026</p>
            <p className="flex items-center gap-2">
              <CheckCircle2 size={15} />
              Built for better research
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App