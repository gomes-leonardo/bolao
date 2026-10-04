import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const items = [
  {
    to: "/rodada",
    label: "Rodada",
    icon: (
      <>
        <path d="M5 3h10l4 4v14H5z" />
        <path d="M15 3v4h4" />
      </>
    ),
  },
  {
    to: "/ranking",
    label: "Ranking",
    icon: <path d="M6 20V10M12 20V4M18 20v-7" />,
  },
  {
    to: "/boloes",
    label: "Bolões",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" />
      </>
    ),
  },
  {
    to: "/perfil",
    label: "Perfil",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
];

/** O ranking mora em /boloes/:id/ranking, mas pertence à aba Ranking, não à aba Bolões. */
export function isTabActive(tab: string, pathname: string): boolean {
  const isRanking = pathname === "/ranking" || pathname.endsWith("/ranking");
  if (tab === "/ranking") return isRanking;
  if (tab === "/boloes") return pathname.startsWith("/boloes") && !isRanking;
  return pathname.startsWith(tab);
}

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 mx-auto grid max-w-md grid-cols-4 border-t-2 border-surface bg-asphalt px-2 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      {items.map((item) => {
        const active = isTabActive(item.to, pathname);
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] ${
              active
                ? "font-bold text-fluor-orange"
                : "font-semibold text-muted"
            }`}
          >
            <Icon>{item.icon}</Icon>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
