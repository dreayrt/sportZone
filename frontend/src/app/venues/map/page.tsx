import { Suspense } from "react";
import Directory from "@/components/venues/Directory";
export default function Page() {
  return (
    <Suspense fallback={<p className="p-8">Đang tải…</p>}>
      <Directory mapView />
    </Suspense>
  );
}
