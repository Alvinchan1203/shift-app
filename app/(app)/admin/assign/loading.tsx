export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="h-12 bg-gray-100 rounded-xl mb-4 animate-pulse" />
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-50 border-r" />
          ))}
        </div>
        {[...Array(5)].map((_, row) => (
          <div key={row} className="grid grid-cols-7">
            {[...Array(7)].map((_, col) => (
              <div key={col} className="border-b border-r h-20 p-2">
                <div className="h-3 w-3 bg-gray-200 rounded animate-pulse mb-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
