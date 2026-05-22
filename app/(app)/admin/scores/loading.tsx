export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="h-10 bg-gray-50 border-b animate-pulse" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b last:border-0">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
