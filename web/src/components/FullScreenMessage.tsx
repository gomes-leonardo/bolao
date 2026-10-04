import type { ReactNode } from "react";

export function FullScreenMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6 text-center font-display text-xl font-black stretch-semi">
      {children}
    </div>
  );
}
