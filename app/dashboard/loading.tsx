export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-9 w-48 bg-muted rounded-md" />
        <div className="h-5 w-80 bg-muted rounded-md mt-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-9 w-24 bg-muted rounded mt-3" />
            <div className="h-3 w-16 bg-muted rounded mt-3" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card p-6">
          <div className="h-6 w-24 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
          <div className="space-y-3 mt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="h-6 w-24 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded mt-2" />
          <div className="space-y-3 mt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
