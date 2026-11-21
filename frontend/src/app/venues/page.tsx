import { Suspense } from "react";
import Directory from "@/components/venues/Directory";
import { GridRouteSkeleton } from "@/components/layout/RouteSkeletons";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Remount when the URL query changes (e.g. header sport shortcuts) so the
  // filters are re-read from the URL instead of keeping stale state.
  const key = JSON.stringify(params);
  return (
    <Suspense fallback={<GridRouteSkeleton />}>
      <Directory key={key} />
    </Suspense>
  );
}
