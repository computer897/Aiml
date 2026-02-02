import { FileText } from 'lucide-react'

function NoteCard({ note }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-gray-900">{note.title}</h3>
            {note.isImportant && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                Important
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{note.content}</p>
          {note.attachments && note.attachments.length > 0 && (
            <div className="mb-2">
              {note.attachments.map((attachment, index) => (
                <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded mr-2 mb-1">
                  📎 {attachment}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{note.teacher}</span>
            <span>•</span>
            <span>{note.date}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoteCard
