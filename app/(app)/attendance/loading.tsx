export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mb-5" />
      <div className="flex flex-wrap gap-2 mb-5">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border overflow-x-auto">
        <div className="flex">
          <div className="w-36 shrink-0 border-r">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 border-b px-3 flex items-center">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="flex-1 h-72 bg-gray-50 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
