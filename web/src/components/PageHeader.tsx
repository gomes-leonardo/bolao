import type { ReactNode } from "react";
import { Link } from "react-router";
import { Wordmark } from "./Wordmark";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  backTo?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  backTo,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 px-5 pt-5 pb-4">
      <div className="flex min-h-11 items-center justify-between gap-3">
        {backTo ? (
          <Link
            to={backTo}
            aria-label="Voltar"
            className="flex size-11 items-center justify-center bg-surface"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
        ) : (
          <Wordmark size="sm" />
        )}
        {action}
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[46px] leading-[0.9] font-black stretch-wide misprint-orange">
          {title}
        </h1>
        {subtitle && <p className="text-[15px] text-muted">{subtitle}</p>}
      </div>
    </header>
  );
}
