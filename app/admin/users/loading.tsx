export default function Loading() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex justify-end mb-4">
        <div className="h-9 w-24 bg-gray-200 rounded-xl animate-pulse" />
      </div>
      {[...Array(2)].map((_, g) => (
        <div key={g} className="mb-6">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="bg-white rounded-2xl border shadow-sm divide-y">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-7 w-16 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-7 w-16 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
