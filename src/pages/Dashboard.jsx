import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ReportCard from '../components/ReportCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, FileText, TrendingUp, AlertTriangle } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/')
        return
      }
      setUser(data.session.user)
      fetchReports(data.session.user.id)
    })
  }, [navigate])

  const fetchReports = async (userId) => {
    const { data } = await supabase
      .from('circuit_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }

  const chartData = reports.slice(0, 7).reverse().map(r => ({
    date: new Date(r.created_at).toLocaleDateString(),
    confidence: r.confidence || 0,
  }))

  const avgConfidence = reports.length
    ? Math.round(reports.reduce((sum, r) => sum + (r.confidence || 0), 0) / reports.length)
    : 0

  if (loading) return <div className="text-center py-20 text-zinc-500">Loading...</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-zinc-400">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <FileText className="w-5 h-5 text-cyan-400 mb-2" />
          <p className="text-2xl font-bold">{reports.length}</p>
          <p className="text-xs text-zinc-500">Total Reports</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <Activity className="w-5 h-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold">{avgConfidence}%</p>
          <p className="text-xs text-zinc-500">Avg Confidence</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <TrendingUp className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold">{reports.filter(r => r.solution).length}</p>
          <p className="text-xs text-zinc-500">Resolved</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold">{reports.filter(r => !r.solution).length}</p>
          <p className="text-xs text-zinc-500">Pending</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-10">
          <h2 className="font-semibold mb-4">Confidence Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" stroke="#52525b" fontSize={12} />
              <YAxis stroke="#52525b" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                labelStyle={{ color: '#e4e4e7' }}
              />
              <Bar dataKey="confidence" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Recent Reports</h2>
      {reports.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-lg mb-2">No reports yet</p>
          <p className="text-sm">Upload a circuit image to get started</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(report => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  )
}
