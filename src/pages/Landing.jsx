import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CircuitBoard, Upload, Zap, Users, Cpu, Shield } from 'lucide-react'

const features = [
  { icon: Upload, title: 'Upload & Analyze', desc: 'Drag your circuit image and describe the issue. AI diagnoses it instantly.' },
  { icon: Zap, title: 'Instant Diagnosis', desc: 'Get detected issues, confidence scores, and step-by-step fixes.' },
  { icon: Users, title: 'Community Hub', desc: 'Share fixes, ask questions, and learn from other electronics enthusiasts.' },
  { icon: Cpu, title: 'Smart AI', desc: 'Powered by GPT-4o and Gemini. Detects wiring, shorts, polarity, and more.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your circuits and data are protected with Row Level Security.' },
]

export default function Landing() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-4 py-1.5 text-sm text-cyan-400 mb-6">
            <CircuitBoard className="w-4 h-4" /> AI-Powered Circuit Troubleshooting
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Fix Your Circuits
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              With AI
            </span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10">
            Upload a photo of your breadboard, PCB, or schematic. Describe the problem.
            Our AI detects wiring errors, shorts, polarity issues, and missing components.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/upload"
              className="bg-cyan-600 hover:bg-cyan-500 px-8 py-3.5 rounded-xl font-semibold text-lg transition"
            >
              Start Diagnosing
            </Link>
            <Link
              to="/community"
              className="border border-zinc-700 hover:border-zinc-500 px-8 py-3.5 rounded-xl font-semibold text-lg transition"
            >
              Explore Community
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition"
            >
              <f.icon className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-800 py-16 text-center text-zinc-500 text-sm">
        <p>Built with React, Supabase, and AI. Open source on GitHub.</p>
      </section>
    </div>
  )
}
