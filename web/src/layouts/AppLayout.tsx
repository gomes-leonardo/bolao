import { Outlet } from "react-router";
import { BottomNav } from "../components/BottomNav";

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="flex flex-1 flex-col pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
