import SkeletonPulse, { SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main pt-10">
        <SkeletonPulse className="h-4 w-40 mb-6" />
        <div className="flex justify-between items-start mb-12">
          <div className="w-full max-w-md">
            <SkeletonPulse className="h-10 w-3/4 mb-3" />
            <SkeletonPulse className="h-4 w-1/2" />
          </div>
          <SkeletonPulse className="hidden sm:block h-10 w-32 rounded-lg" />
        </div>
        <div className="flex gap-2 mb-8 overflow-hidden">
           {[1,2,3,4,5].map(i => <SkeletonPulse key={i} className="h-8 w-20 rounded-full shrink-0" />)}
        </div>
        <div className="content-grid" style={{ gap: "16px" }}>
           {[1,2,3,4,5,6].map(i => (
             <div key={i} className="card h-[280px] p-4 flex flex-col gap-4" style={{ border: "0.5px solid #e5e5e5" }}>
               <SkeletonPulse className="h-32 w-full rounded-xl" />
               <SkeletonPulse className="h-6 w-3/4" />
               <SkeletonText count={2} />
             </div>
           ))}
        </div>
      </div>
    </section>
  );
}
