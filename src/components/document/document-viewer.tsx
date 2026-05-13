"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { DocumentToolbar } from "./document-toolbar";
import { DocumentThumbnailList, type DocumentPageItem } from "./document-thumbnail-list";

export function DocumentViewer({
  invoiceId,
  originalMimeType,
  pages
}: {
  invoiceId: string;
  originalMimeType: string | null;
  pages: DocumentPageItem[];
}) {
  const [selectedPage, setSelectedPage] = useState(pages[0]?.pageNumber ?? 1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const originalUrl = `/api/app/invoices/${invoiceId}/file/original`;
  const isPdf = originalMimeType === "application/pdf";
  const imageUrl = useMemo(() => `/api/app/invoices/${invoiceId}/file/page/${selectedPage}`, [invoiceId, selectedPage]);

  return (
    <section className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
      <DocumentToolbar
        originalUrl={originalUrl}
        showImageTools={!isPdf}
        onZoomIn={() => setZoom((value) => Math.min(value + 0.15, 2.5))}
        onZoomOut={() => setZoom((value) => Math.max(value - 0.15, 0.5))}
        onRotate={() => setRotation((value) => (value + 90) % 360)}
      />
      <div className="lg:flex">
        <DocumentThumbnailList invoiceId={invoiceId} pages={pages} selectedPage={selectedPage} onSelectPage={setSelectedPage} />
        <div className="flex h-[calc(100vh-11rem)] flex-1 items-center justify-center overflow-auto bg-ink-100 p-3">
          {isPdf ? (
            <object data={originalUrl} type="application/pdf" className="h-full min-h-[640px] w-full rounded-md bg-white">
              <iframe title="Originalrechnung" src={originalUrl} className="h-full w-full rounded-md bg-white" />
            </object>
          ) : (
            <img
              src={imageUrl}
              alt="Rechnungsvorschau"
              className="max-h-none rounded-md bg-white shadow-panel"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: "center center" }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
