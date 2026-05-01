import SkeletonPulse from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-5xl">
        <SkeletonPulse className="h-4 w-1/3 mb-6" />
        <div className="mt-6">
          <div className="mb-6 flex gap-2">
            <SkeletonPulse className="h-6 w-16 rounded-full" />
            <SkeletonPulse className="h-6 w-20 rounded-full" />
          </div>
          <SkeletonPulse className="h-8 w-1/2 mb-6" />
          <SkeletonPulse className="w-full rounded-2xl" style={{ height: "60vh", minHeight: "400px" }} />
        </div>
      </div>
    </section>
  );
}
