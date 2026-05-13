import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden" aria-label="FinancePro Austria">
        <Image
          src="/financepro-monogram.png"
          alt="FinancePro Austria"
          width={1254}
          height={1254}
          priority
          sizes="40px"
          className="h-10 w-10 object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center" aria-label="FinancePro Austria">
      <Image
        src="/financepro-austria-logo.png"
        alt="FinancePro Austria"
        width={2508}
        height={627}
        priority
        sizes="196px"
        className="h-12 w-auto max-w-[196px] object-contain"
      />
    </div>
  );
}
