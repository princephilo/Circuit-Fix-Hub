import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import UploadZone from '../components/UploadZone'

export default function UploadAnalyzer() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = (acceptedFile) => {
    setFile(acceptedFile)
    setPreview(URL.createObjectURL(acceptedFile))
    setError('')
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('Please describe the circuit issue')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please sign in first')
        setLoading(false)
        return
      }

      let imageUrl = null

      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('circuit-images')
          .upload(path, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage
          .from('circuit-images')
          .getPublicUrl(path)
        imageUrl = publicUrl
      }

      const { data: report, error: dbError } = await supabase
        .from('circuit_reports')
        .insert({
          user_id: user.id,
          image_url: imageUrl,
          prompt: prompt.trim(),
          detected_issue: 'Processing...',
          solution: null,
          confidence: 0,
        })
        .select()
        .single()

      if (dbError) throw dbError

      navigate(`/results/${report.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Circuit Analyzer</h1>
        <p className="text-zinc-400 mb-8">
          Describe your circuit issue, optionally upload an image. AI will diagnose it.
        </p>

        <UploadZone onUpload={handleFile} />

        {preview && (
          <div className="mt-4 relative">
            <img src={preview} alt="Preview" className="max-h-80 rounded-xl object-contain bg-zinc-900" />
            <button
              onClick={() => { setFile(null); setPreview(null) }}
              className="absolute top-2 right-2 bg-zinc-900/80 rounded-full px-3 py-1 text-sm text-zinc-400 hover:text-white"
            >
              Remove
            </button>
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Describe the issue <span className="text-red-400">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. LED not glowing in Arduino circuit, motor not spinning..."
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>

        {error && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
          ) : (
            <><Sparkles className="w-5 h-5" /> Analyze Circuit</>
          )}
        </button>
      </motion.div>
    </div>
  )
}
