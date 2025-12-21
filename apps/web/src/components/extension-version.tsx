"use client";

import * as React from "react";

type VersionInfo = {
  version: string;
  hash: string;
  date: string;
  branch: string;
  timestamp: string;
};

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return `${day} ${month} ${year}, ${time}`;
}

export function ExtensionVersion() {
  const [version, setVersion] = React.useState<VersionInfo | null>(null);

  React.useEffect(() => {
    fetch("/api/extension-version")
      .then((res) => res.json())
      .then((data) => setVersion(data))
      .catch(() => setVersion(null));
  }, []);

  if (!version) return null;

  return (
    <p className="text-xs text-muted-foreground mt-3">
      Extension version: <code className="font-mono font-semibold">v{version.version}</code>
      {" "}
      <span className="opacity-70">({formatTimestamp(version.timestamp)})</span>
    </p>
  );
}
