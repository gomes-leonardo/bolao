import { loginSchema, type LoginInput } from "@bolao/core/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { Paper } from "../components/Paper";
import { Stamp } from "../components/Stamp";
import { TextField } from "../components/TextField";
import { Wordmark } from "../components/Wordmark";
import { config } from "../config";
import { authErrorMessage } from "./auth-errors";

function useAfterLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const state: unknown = location.state;
  const from =
    typeof state === "object" &&
    state !== null &&
    "from" in state &&
    typeof state.from === "string"
      ? state.from
      : "/rodada";
  return () => void navigate(from, { replace: true });
}

function DevLogin({ onDone }: { onDone: () => void }) {
  const { signInAsDevUser } = useAuth();
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const enter = async () => {
    setPending(true);
    setError(undefined);
    try {
      await signInAsDevUser(Number(userId));
      onDone();
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void enter();
      }}
      className="flex flex-col gap-3 border-2 border-dashed border-line p-4"
    >
      <p className="text-sm text-muted">
        <strong className="text-tape">Modo dev.</strong> Entra com o id de um
        usuário do <code>npm run db:seed</code>.
      </p>
      <TextField
        label="Id do usuário"
        inputMode="numeric"
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
        error={error}
      />
      <Button type="submit" variant="outline" disabled={pending || !userId}>
        {pending ? "ENTRANDO…" : "ENTRAR COMO DEV"}
      </Button>
    </form>
  );
}

export function LoginPage() {
  const { status, signIn } = useAuth();
  const afterLogin = useAfterLogin();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const [error, setError] = useState<string>();

  if (status === "authenticated") return <Navigate to="/rodada" replace />;

  const submit = form.handleSubmit(async (input) => {
    setError(undefined);
    try {
      await signIn(input);
      afterLogin();
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-7 px-6 pt-6 pb-8">
      <Wordmark />
      <Paper
        tilt="left"
        tape="left"
        className="mt-3 ml-1.5 self-start px-5 pt-5 pb-6"
      >
        <p className="font-display text-[52px] leading-[0.9] font-black stretch-extra">
          MANDA
          <br />
          TEU
          <br />
          <span className="text-fluor-orange">PALPITE.</span>
        </p>
        <span className="absolute -top-4 -right-5">
          <Stamp size="sm" tone="pink">
            RODADA ABERTA
          </Stamp>
        </span>
      </Paper>

      <form
        onSubmit={(event) => void submit(event)}
        className="mt-auto flex flex-col gap-4"
        noValidate
      >
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />
        {error && (
          <p role="alert" className="text-sm text-fluor-pink">
            {error}
          </p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          ENTRAR
        </Button>
        <p className="text-center text-[15px] text-muted">
          Primeira vez aqui?{" "}
          <Link to="/cadastro" className="font-bold text-fluor-orange">
            Cola com a gente
          </Link>
        </p>
      </form>

      {config.authMode === "dev" && <DevLogin onDone={afterLogin} />}
    </div>
  );
}
