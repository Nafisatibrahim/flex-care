/**
 * ExerciseCapture — Phase 5.1
 * Camera access: preview, capture frames, and optional short recording
 * for later posture analysis and feedback.
 */

import { useState, useRef, useEffect } from 'react'

export default function ExerciseCapture({ exerciseName = 'exercise', onFramesCaptured, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | asking | live | recording | error
  const [errorMessage, setErrorMessage] = useState(null)
  const [capturedFrames, setCapturedFrames] = useState([])
  const [recordedBlob, setRecordedBlob] = useState(null)

  const startCamera = async () => {
    setStatus('asking')
    setErrorMessage(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      setStatus('live')
    } catch (err) {
      setStatus('error')
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Camera access was denied. Allow camera in your browser to record your exercise.')
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('No camera found.')
      } else {
        setErrorMessage(err.message || 'Could not start camera.')
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStatus('idle')
    setErrorMessage(null)
  }

  useEffect(() => {
    if (status === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [status])

  useEffect(() => {
    return () => {
      stopCamera()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const captureFrame = () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedFrames((prev) => [...prev, dataUrl])
    if (onFramesCaptured) {
      onFramesCaptured([...capturedFrames, dataUrl])
    }
  }

  const startRecording = () => {
    const stream = streamRef.current
    if (!stream) return
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })
      const chunks = []
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        setRecordedBlob(blob)
      }
      recorder.start(200)
      mediaRecorderRef.current = recorder
      setStatus('recording')
    } catch (err) {
      setErrorMessage('Recording not supported in this browser.')
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    setStatus('live')
  }

  const hasContent = capturedFrames.length > 0 || recordedBlob

  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-800">
          Record & get feedback {exerciseName ? `— ${exerciseName}` : ''}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-sm"
          >
            Close
          </button>
        )}
      </div>
      <p className="text-sm text-slate-600">
        Use your camera to record yourself doing the exercise, or capture a few frames. Feedback (posture analysis) will be added in a later step.
      </p>

      {status === 'idle' && (
        <button
          type="button"
          onClick={startCamera}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Start camera
        </button>
      )}

      {status === 'asking' && (
        <p className="text-sm text-slate-600">Requesting camera access…</p>
      )}

      {status === 'error' && (
        <div className="p-3 bg-red-50 rounded border border-red-200 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      {(status === 'live' || status === 'recording') && (
        <div className="space-y-2">
          <div className="relative rounded overflow-hidden bg-black max-w-md">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-video object-cover"
            />
            {status === 'recording' && (
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-red-600 text-white text-xs font-medium">
                Recording
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={captureFrame}
              className="px-3 py-1.5 rounded bg-slate-700 text-white text-sm hover:bg-slate-800"
            >
              Capture frame
            </button>
            {status === 'live' ? (
              <button
                type="button"
                onClick={startRecording}
                className="px-3 py-1.5 rounded bg-red-600 text-white text-sm hover:bg-red-700"
              >
                Start recording
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-3 py-1.5 rounded bg-red-600 text-white text-sm hover:bg-red-700"
              >
                Stop recording
              </button>
            )}
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-100"
            >
              Stop camera
            </button>
          </div>
        </div>
      )}

      {capturedFrames.length > 0 && (
        <p className="text-sm text-slate-600">
          Captured {capturedFrames.length} frame{capturedFrames.length !== 1 ? 's' : ''}.
        </p>
      )}
      {recordedBlob && (
        <p className="text-sm text-slate-600">
          Recording saved ({(recordedBlob.size / 1024).toFixed(1)} KB). Ready for posture analysis in the next step.
        </p>
      )}
      {hasContent && (
        <p className="text-xs text-slate-500">
          Pose analysis and feedback (Phase 5.2–5.4) will use this capture to give you form tips.
        </p>
      )}
    </div>
  )
}
