"use client";

import * as React from "react";

type VersionInfo = {
  version: string;
  hash: string;
  date: string;
  branch: string;
  timestamp: string;
};

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
      <span className="opacity-70">({version.hash} - {version.date})</span>
    </p>
  );
}
