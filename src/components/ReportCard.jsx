import { Link } from 'react-router-dom'
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react'

export default function ReportCard({ report }) {
  const confidenceColor =
    report.confidence >= 80 ? 'text-green-400' :
    report.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'

  return (
    <Link
      to={`/results/${report.id}`}
      className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition"
    >
      <div className="flex items-start justify-between mb-3">
        <FileText className="w-5 h-5 text-cyan-400" />
        <span className={`text-sm font-mono font-bold ${confidenceColor}`}>
          {report.confidence}%
        </span>
      </div>
      <h3 className="font-semibold text-zinc-200 mb-1 line-clamp-1">
        {report.detected_issue || 'No issue detected'}
      </h3>
      <p className="text-sm text-zinc-500 line-clamp-2">{report.prompt}</p>
      <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
        {report.solution ? (
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle className="w-3 h-3" /> Solution ready
          </span>
        ) : (
          <span className="flex items-center gap-1 text-yellow-400">
            <AlertTriangle className="w-3 h-3" /> Pending
          </span>
        )}
        <span className="ml-auto">{new Date(report.created_at).toLocaleDateString()}</span>
      </div>
    </Link>
  )
}
