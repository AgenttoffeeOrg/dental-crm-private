export default function Loading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading audit data...</p>
      </div>
    </div>
  );
}

