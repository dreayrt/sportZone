export default function Template({ children }: { children: React.ReactNode }) {
  // Re-mounts on each route change, so every page fades in instead of popping.
  return <div className="animate-fade-in">{children}</div>;
}
