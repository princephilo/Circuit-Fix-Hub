import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { AlertTriangle, CheckCircle, Lightbulb, ArrowLeft, Loader2, RefreshCw } from 'lucide-react'

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

      const updated = {
        detected_issue: data.issue || 'Could not determine',
        solution: data.fix_steps?.join('\n') || 'No solution available',
        explanation: data.explanation || '',
        confidence: data.confidence || 50,
      }

      await supabase
        .from('circuit_reports')
        .update(updated)
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
        })
        .eq('id', reportData.id)

      setReport(prev => ({
        ...prev,
        detected_issue: 'Analysis failed',
        solution: errorMsg,
        confidence: 0,
      }))
    } finally {
      setAnalyzing(false)
    }
  }

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

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 text-red-400 mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <h2 className="font-semibold">Detected Issue</h2>
                </div>
                <p className="text-zinc-200">{report.detected_issue}</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 text-green-400 mb-3">
                  <CheckCircle className="w-5 h-5" />
                  <h2 className="font-semibold">Confidence Score</h2>
                </div>
                <p className={`text-4xl font-bold font-mono ${confidenceColor}`}>
                  {report.confidence}%
                </p>
              </div>
            </div>

            {report.explanation && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 text-blue-400 mb-3">
                  <Lightbulb className="w-5 h-5" />
                  <h2 className="font-semibold">Explanation</h2>
                </div>
                <p className="text-zinc-300 leading-relaxed">{report.explanation}</p>
              </div>
            )}

            {report.solution && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 text-cyan-400 mb-3">
                  <CheckCircle className="w-5 h-5" />
                  <h2 className="font-semibold">Fix Steps</h2>
                </div>
                <ol className="list-decimal list-inside text-zinc-300 space-y-2">
                  {report.solution.split('\n').map((step, i) => (
                    <li key={i}>{step.replace(/^\d+\.\s*/, '')}</li>
                  ))}
                </ol>
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
