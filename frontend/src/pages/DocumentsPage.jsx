import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Plus, Trash2, Download, ExternalLink, Clock,
  Loader2, X, ArrowLeft, Link as LinkIcon, File, Image, Video,
  FileSpreadsheet, Presentation, AlertCircle
} from 'lucide-react'
import { documentAPI, classAPI } from '../services/api'

function DocumentsPage({ userRole = 'teacher' }) {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState('all')
  
  // Form state
  const [formData, setFormData] = useState({
    classId: '',
    title: '',
    description: '',
    fileUrl: '',
    fileName: '',
    fileType: 'link',
    fileSize: 0,
  })
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')
  
  useEffect(() => {
    fetchData()
  }, [userRole])
  
  const fetchData = async () => {
    setLoading(true)
    try {
      if (userRole === 'teacher') {
        // Get teacher's classes and all their documents
        const classesData = await classAPI.getTeacherClasses()
        setClasses(classesData)
        
        const allDocs = []
        for (const cls of classesData) {
          try {
            const classDocs = await documentAPI.getByClass(cls._id)
            allDocs.push(...classDocs.map(d => ({
              ...d,
              className: cls.title
            })))
          } catch (err) {
            console.error(`Error fetching documents for class ${cls._id}:`, err)
          }
        }
        
        allDocs.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
        setDocuments(allDocs)
      } else {
        // Get student's enrolled classes and their documents
        const classesData = await classAPI.getStudentClasses()
        setClasses(classesData)
        
        const allDocs = []
        for (const cls of classesData) {
          try {
            const classDocs = await documentAPI.getByClass(cls._id)
            allDocs.push(...classDocs.map(d => ({
              ...d,
              className: cls.title
            })))
          } catch (err) {
            console.error(`Error fetching documents for class ${cls._id}:`, err)
          }
        }
        
        allDocs.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
        setDocuments(allDocs)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleUpload = async (e) => {
    e.preventDefault()
    setFormError('')
    
    if (!formData.classId || !formData.title || !formData.fileUrl) {
      setFormError('Please fill in all required fields')
      return
    }
    
    // Extract filename from URL if not provided
    let fileName = formData.fileName
    if (!fileName) {
      try {
        const url = new URL(formData.fileUrl)
        fileName = url.pathname.split('/').pop() || 'document'
      } catch {
        fileName = 'document'
      }
    }
    
    setUploading(true)
    try {
      await documentAPI.upload(
        formData.classId,
        formData.title,
        formData.description,
        formData.fileUrl,
        fileName,
        formData.fileType,
        formData.fileSize
      )
      setShowUploadModal(false)
      setFormData({
        classId: '',
        title: '',
        description: '',
        fileUrl: '',
        fileName: '',
        fileType: 'link',
        fileSize: 0,
      })
      fetchData()
    } catch (error) {
      setFormError(error.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }
  
  const handleDelete = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      await documentAPI.delete(documentId)
      setDocuments(prev => prev.filter(d => d._id !== documentId))
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }
  
  const handleView = async (doc) => {
    try {
      // Mark as viewed
      await documentAPI.markViewed(doc._id)
      // Open in new tab
      window.open(doc.file_url, '_blank')
    } catch (error) {
      console.error('Error marking document viewed:', error)
      // Still open the document
      window.open(doc.file_url, '_blank')
    }
  }
  
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />
      case 'doc':
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-500" />
      case 'ppt':
      case 'pptx':
        return <Presentation className="w-5 h-5 text-orange-500" />
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />
      case 'image':
        return <Image className="w-5 h-5 text-purple-500" />
      case 'video':
        return <Video className="w-5 h-5 text-pink-500" />
      case 'link':
        return <LinkIcon className="w-5 h-5 text-primary-500" />
      default:
        return <File className="w-5 h-5 text-gray-500" />
    }
  }
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return ''
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }
  
  const filteredDocuments = selectedClass === 'all'
    ? documents
    : documents.filter(d => d.class_id === selectedClass)
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {userRole === 'teacher' ? 'Documents & Materials' : 'Study Materials'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {userRole === 'teacher' 
                  ? 'Share study materials with your students'
                  : 'Access materials shared by your teachers'}
              </p>
            </div>
          </div>
          {userRole === 'teacher' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Material
            </button>
          )}
        </div>
        
        {/* Filter */}
        {classes.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedClass('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedClass === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                All Classes
              </button>
              {classes.map((cls) => (
                <button
                  key={cls._id}
                  onClick={() => setSelectedClass(cls._id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedClass === cls._id
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {cls.title}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No materials yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {userRole === 'teacher'
                ? 'Share your first document or link with your students'
                : 'No study materials have been shared yet'}
            </p>
            {userRole === 'teacher' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc._id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      {getFileIcon(doc.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                        {doc.title}
                      </h3>
                      {doc.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {doc.className}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(doc.uploaded_at)}
                        </span>
                        {doc.file_size > 0 && (
                          <span>{formatFileSize(doc.file_size)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {doc.download_count} {doc.download_count === 1 ? 'view' : 'views'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(doc)}
                      className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg text-primary-600 transition-colors"
                      title="Open"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    {userRole === 'teacher' && (
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Material</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Class *
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData(prev => ({ ...prev, classId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Choose a class...</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>{cls.title}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Week 1 Lecture Notes"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the material..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  File Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'link', label: 'Link', icon: LinkIcon },
                    { id: 'pdf', label: 'PDF', icon: FileText },
                    { id: 'doc', label: 'Doc', icon: FileText },
                    { id: 'ppt', label: 'PPT', icon: Presentation },
                    { id: 'video', label: 'Video', icon: Video },
                    { id: 'other', label: 'Other', icon: File },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fileType: id }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        formData.fileType === id
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  File URL *
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
                    placeholder="https://drive.google.com/file/..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Paste a link from Google Drive, Dropbox, OneDrive, or any file hosting service
                </p>
              </div>
              
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Material'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentsPage
