interface DashboardRouteLoadingProps {
  statCards?: number;
  filterColumns?: number;
  tableRows?: number;
  contentBlocks?: number;
}

function LoadingBar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-slate-200/80 ${className}`} />;
}

export function DashboardRouteLoading({
  statCards = 0,
  filterColumns = 0,
  tableRows = 0,
  contentBlocks = 0,
}: DashboardRouteLoadingProps) {
  return (
    <div className="space-y-6">
      <div className="glass-panel relative overflow-hidden rounded-[34px] p-7">
        <div className="space-y-4">
          <LoadingBar className="h-7 w-32" />
          <LoadingBar className="h-10 w-72" />
          <LoadingBar className="h-5 w-full max-w-2xl" />
          <LoadingBar className="h-5 w-full max-w-xl" />
        </div>
      </div>

      {statCards > 0 ? (
        <div className={`grid gap-5 ${statCards >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2"}`}>
          {Array.from({ length: statCards }, (_, index) => (
            <div key={index} className="glass-panel rounded-[26px] p-5">
              <LoadingBar className="h-4 w-24" />
              <LoadingBar className="mt-4 h-10 w-24" />
              <LoadingBar className="mt-3 h-4 w-32" />
            </div>
          ))}
        </div>
      ) : null}

      {filterColumns > 0 ? (
        <div className={`grid gap-4 ${filterColumns > 1 ? "lg:grid-cols-2" : ""}`}>
          {Array.from({ length: filterColumns }, (_, index) => (
            <div key={index} className="glass-panel rounded-[24px] p-4">
              <LoadingBar className="h-4 w-28" />
              <LoadingBar className="mt-4 h-12 w-full rounded-[16px]" />
            </div>
          ))}
        </div>
      ) : null}

      {tableRows > 0 ? (
        <div className="glass-panel rounded-[28px] p-5">
          <LoadingBar className="h-5 w-40" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: tableRows }, (_, index) => (
              <div key={index} className="rounded-[20px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                <LoadingBar className="h-4 w-36" />
                <LoadingBar className="mt-3 h-4 w-full" />
                <LoadingBar className="mt-2 h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {contentBlocks > 0 ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {Array.from({ length: contentBlocks }, (_, index) => (
            <div key={index} className="glass-panel rounded-[28px] p-5">
              <LoadingBar className="h-5 w-40" />
              <LoadingBar className="mt-4 h-4 w-full max-w-lg" />
              <div className="mt-5 space-y-3">
                <LoadingBar className="h-28 w-full rounded-[20px]" />
                <LoadingBar className="h-28 w-full rounded-[20px]" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
