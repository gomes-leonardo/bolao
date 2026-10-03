import { createBrowserRouter, Navigate } from "react-router";
import { RequireAuth } from "./auth/RequireAuth";
import { AppLayout } from "./layouts/AppLayout";
import { JoinOrCreatePoolPage } from "./pages/JoinOrCreatePoolPage";
import { LoginPage } from "./pages/LoginPage";
import { MatchWallPage } from "./pages/MatchWallPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PoolsPage } from "./pages/PoolsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { CurrentPoolRanking, RankingPage } from "./pages/RankingPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RoundPage } from "./pages/RoundPage";

export const router = createBrowserRouter([
  { path: "/entrar", element: <LoginPage /> },
  { path: "/cadastro", element: <RegisterPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/rodada" replace /> },
      { path: "rodada", element: <RoundPage /> },
      { path: "ranking", element: <CurrentPoolRanking /> },
      { path: "boloes", element: <PoolsPage /> },
      { path: "boloes/entrar", element: <JoinOrCreatePoolPage /> },
      { path: "boloes/:poolId/ranking", element: <RankingPage /> },
      { path: "boloes/:poolId/jogos/:matchId", element: <MatchWallPage /> },
      { path: "perfil", element: <ProfilePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
