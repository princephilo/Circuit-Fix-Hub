import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { AlertTriangle, CheckCircle, Lightbulb, ArrowLeft, Loader2, RefreshCw, Bug, Zap, Cpu, Settings } from 'lucide-react'

const categoryIcons = {
  wiring: Zap, short: AlertTriangle, polarity: Bug, resistor: Settings,
  power: Zap, microcontroller: Cpu, sensor: Cpu, opamp: Settings,
  logic: Cpu, pcb: Settings, component: AlertTriangle, feedback: Settings,
  beginners: Bug, capacitor: Settings,
}

export default function Results() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [id])

  const fetchReport = async () => {
    const { data } = await supabase
      .from('circuit_reports')
      .select('*')
      .eq('id', id)
      .single()
    setReport(data)
    setLoading(false)

    if (data && (!data.detected_issue || data.detected_issue === 'Processing...')) {
      runAnalysis(data)
    }
  }

  const runAnalysis = async (reportData) => {
    setAnalyzing(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session?.data?.session?.access_token

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/troubleshoot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            prompt: reportData.prompt,
            imageUrl: reportData.image_url,
          }),
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Edge function error (${response.status}): ${errText}`)
      }

      const data = await response.json()
      const issues = data.issues || []
      const first = issues[0] || {}
      const allFixSteps = issues.flatMap(i => i.fix_steps || [])

      const updated = {
        detected_issue: first.issue || data.overall_summary || 'Could not determine',
        explanation: data.overall_summary || issues.map(i => i.explanation).filter(Boolean).join('\n\n') || '',
        solution: allFixSteps.join('\n') || 'No solution available',
        confidence: data.overall_confidence || first.confidence || 50,
        issues: issues,
      }

      await supabase
        .from('circuit_reports')
        .update({
          detected_issue: updated.detected_issue,
          solution: updated.solution,
          explanation: updated.explanation,
          confidence: updated.confidence,
          issues: updated.issues,
        })
        .eq('id', reportData.id)

      setReport(prev => ({ ...prev, ...updated }))
    } catch (err) {
      console.error('Analysis failed:', err)
      const errorMsg = err.message || 'Unknown error'

      await supabase
        .from('circuit_reports')
        .update({
          detected_issue: 'Analysis failed',
          solution: errorMsg,
          confidence: 0,
          issues: [],
        })
        .eq('id', reportData.id)

      setReport(prev => ({
        ...prev,
        detected_issue: 'Analysis failed',
        solution: errorMsg,
        confidence: 0,
        issues: [],
      }))
    } finally {
      setAnalyzing(false)
    }
  }

  const issues = report?.issues || []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p>Report not found</p>
        <Link to="/dashboard" className="text-cyan-400 hover:underline mt-2 inline-block">Back to Dashboard</Link>
      </div>
    )
  }

  const isProcessing = !report.detected_issue || report.detected_issue === 'Processing...'
  const confidenceColor =
    report.confidence >= 80 ? 'text-green-400' :
    report.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-zinc-400 hover:text-cyan-400 mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {isProcessing ? (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Analyzing Your Circuit</h2>
            <p className="text-zinc-400">Our AI is examining the issue...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Analysis Results</h1>
              <span className={`text-3xl font-bold font-mono ${confidenceColor}`}>
                {report.confidence}%
              </span>
            </div>

            {report.image_url && (
              <img
                src={report.image_url}
                alt="Circuit"
                className="w-full max-h-96 object-contain rounded-xl bg-zinc-900 mb-8"
              />
            )}

            {report.explanation && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-2 text-blue-400 mb-3">
                  <Lightbulb className="w-5 h-5" />
                  <h2 className="font-semibold">Summary</h2>
                </div>
                <p className="text-zinc-300 leading-relaxed">{report.explanation}</p>
              </div>
            )}

            {issues.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Bug className="w-5 h-5 text-red-400" />
                  Detected Errors ({issues.length})
                </h2>
                <div className="space-y-4">
                  {issues.map((item, idx) => {
                    const Icon = categoryIcons[item.category] || AlertTriangle
                    const itemConfidenceColor =
                      item.confidence >= 80 ? 'text-green-400' :
                      item.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-5 h-5 ${itemConfidenceColor}`} />
                            <h3 className="font-semibold text-zinc-100">{item.issue}</h3>
                          </div>
                          <span className={`text-lg font-mono font-bold ${itemConfidenceColor}`}>
                            {item.confidence}%
                          </span>
                        </div>
                        {item.explanation && (
                          <p className="text-zinc-400 text-sm mb-3">{item.explanation}</p>
                        )}
                        {item.fix_steps && item.fix_steps.length > 0 && (
                          <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Fix Steps</p>
                            <ol className="list-decimal list-inside text-zinc-300 text-sm space-y-1">
                              {item.fix_steps.map((step, si) => (
                                <li key={si}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => runAnalysis(report)}
              disabled={analyzing}
              className="flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
              Re-analyze
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
