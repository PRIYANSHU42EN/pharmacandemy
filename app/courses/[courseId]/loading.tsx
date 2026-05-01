import SkeletonPulse, { SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <section className="py-20 text-center" style={{ minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-4xl">
        <SkeletonPulse className="h-10 w-1/2 mx-auto mb-4" />
        <SkeletonPulse className="h-4 w-3/4 mx-auto mb-10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card flex flex-col h-full" style={{ border: "0.5px solid #e5e5e5" }}>
              <SkeletonPulse className="h-[120px] rounded-none" />
              <div className="p-4 flex flex-col gap-3">
                <SkeletonPulse className="h-4 w-20" />
                <SkeletonPulse className="h-6 w-3/4" />
                <SkeletonText count={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
