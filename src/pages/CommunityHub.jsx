import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { MessageSquare, Plus, X } from 'lucide-react'

export default function CommunityHub() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchPosts()
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    const { error } = await supabase.from('community_posts').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
    })
    if (!error) {
      setShowModal(false)
      setTitle('')
      setDescription('')
      fetchPosts()
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Community Hub</h1>
          <p className="text-zinc-400">Share issues, solutions, and learn together</p>
        </div>
        {user && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 rounded-xl font-medium transition"
          >
            <Plus className="w-4 h-4" /> New Post
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-500">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-1">No posts yet</p>
          <p className="text-sm">Be the first to share a circuit issue or solution</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition"
            >
              <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
              {post.description && (
                <p className="text-zinc-400 text-sm mb-3">{post.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <MessageSquare className="w-3 h-3" />
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">New Post</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 mb-3"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue or solution..."
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 resize-none mb-4"
            />
            <button
              onClick={handleCreate}
              className="w-full bg-cyan-600 hover:bg-cyan-500 py-3 rounded-xl font-medium transition"
            >
              Post
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
