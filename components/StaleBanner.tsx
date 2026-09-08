export default function StaleBanner({
  serviceName,
  fetchedAt,
  error,
}: {
  serviceName: string;
  fetchedAt: string | null;
  error: string | null;
}) {
  const when = fetchedAt
    ? new Date(fetchedAt).toLocaleString()
    : "an earlier session";
  return (
    <div className="stale-banner">
      Showing last-known data from {when} — {serviceName} is unreachable right now
      {error ? ` (${error})` : ""}.
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner">{message}</div>;
}
