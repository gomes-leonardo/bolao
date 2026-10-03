import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Paper } from "../components/Paper";
import { config } from "../config";

export function ProfilePage() {
  const { user, signOut } = useAuth();

  return (
    <>
      <PageHeader title="PERFIL" />
      <div className="flex flex-col gap-5 px-5">
        <Paper tilt="slight" tape="right" className="flex flex-col gap-1 p-4">
          <span className="font-display text-2xl font-black uppercase stretch-semi">
            {user?.name}
          </span>
          <span className="text-sm text-ink-muted">{user?.email}</span>
        </Paper>
        {config.authMode === "dev" && (
          <p className="text-sm text-muted">
            Modo dev: tu entrou como o usuário {user?.id}, sem senha. O login de
            verdade chega com a autenticação JWT.
          </p>
        )}
        <Button variant="outline" onClick={signOut}>
          SAIR
        </Button>
      </div>
    </>
  );
}
