export default function Loading() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="bg-white rounded-2xl border shadow-sm divide-y">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
