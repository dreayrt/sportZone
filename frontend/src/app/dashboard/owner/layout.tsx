import { OwnerGuard } from "@/components/venues/Shared";
import { OwnerVenueProvider } from "@/context/OwnerVenueContext";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OwnerGuard>
      <OwnerVenueProvider>{children}</OwnerVenueProvider>
    </OwnerGuard>
  );
}
