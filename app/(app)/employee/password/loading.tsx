export default function Loading() {
  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="bg-white rounded-2xl border p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ))}
        <div className="h-10 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
