"use client";

import { Download, ExternalLink, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

export function DocumentToolbar({
  originalUrl,
  onZoomIn,
  onZoomOut,
  onRotate,
  showImageTools
}: {
  originalUrl: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  showImageTools: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 bg-white px-3 py-2">
      {showImageTools ? (
        <>
          <button type="button" title="Verkleinern" onClick={onZoomOut} className="focus-ring rounded-md border border-ink-200 p-2 hover:bg-ink-50">
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" title="Vergrößern" onClick={onZoomIn} className="focus-ring rounded-md border border-ink-200 p-2 hover:bg-ink-50">
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" title="Drehen" onClick={onRotate} className="focus-ring rounded-md border border-ink-200 p-2 hover:bg-ink-50">
            <RotateCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      ) : null}
      <a title="Original öffnen" href={originalUrl} target="_blank" className="focus-ring ml-auto rounded-md border border-ink-200 p-2 hover:bg-ink-50">
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
      <a title="Herunterladen" href={`${originalUrl}?download=1`} className="focus-ring rounded-md border border-ink-200 p-2 hover:bg-ink-50">
        <Download className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}
