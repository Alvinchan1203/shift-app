export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b flex items-center justify-between">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-28 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="px-5 py-4 flex flex-wrap gap-2">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
