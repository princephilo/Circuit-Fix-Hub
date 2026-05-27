import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'

export default function UploadZone({ onUpload }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0])
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-cyan-400 bg-cyan-400/10'
          : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
      {isDragActive ? (
        <p className="text-cyan-400 font-medium">Drop your circuit image here</p>
      ) : (
        <div>
          <p className="text-zinc-300 font-medium">Drag & drop circuit image</p>
          <p className="text-zinc-500 text-sm mt-1">or click to browse (PNG, JPG)</p>
        </div>
      )}
    </div>
  )
}
