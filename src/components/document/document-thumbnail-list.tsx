"use client";

/* eslint-disable @next/next/no-img-element */

import { cn } from "@/lib/format";

export interface DocumentPageItem {
  pageNumber: number;
  qualityStatus: string;
  hasPreview?: boolean;
}

export function DocumentThumbnailList({
  invoiceId,
  pages,
  selectedPage,
  onSelectPage
}: {
  invoiceId: string;
  pages: DocumentPageItem[];
  selectedPage: number;
  onSelectPage: (page: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-ink-200 bg-ink-50 p-2 lg:w-24 lg:flex-col lg:border-b-0 lg:border-r">
      {pages.map((page) => (
        <button
          key={page.pageNumber}
          type="button"
          onClick={() => onSelectPage(page.pageNumber)}
          className={cn(
            "min-w-16 rounded-md border bg-white p-2 text-left text-xs transition lg:min-w-0",
            selectedPage === page.pageNumber ? "border-trust-500 text-trust-700" : "border-ink-200 text-ink-600 hover:border-ink-300"
          )}
        >
          {page.hasPreview ? (
            <img
              src={`/api/app/invoices/${invoiceId}/file/thumb/${page.pageNumber}`}
              alt=""
              className="mb-2 h-16 w-full rounded border border-ink-100 object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="mb-2 flex h-16 items-center justify-center rounded border border-ink-100 bg-ink-50 text-[11px] text-ink-400">
              PDF
            </div>
          )}
          <div className="font-medium">Seite {page.pageNumber}</div>
          <div className="mt-1 text-[11px] text-ink-400">{page.qualityStatus === "accepted" ? "gut lesbar" : "prüfen"}</div>
        </button>
      ))}
    </div>
  );
}
