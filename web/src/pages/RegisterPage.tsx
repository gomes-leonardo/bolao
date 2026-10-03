import { registerSchema, type RegisterInput } from "@bolao/core/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { TextField } from "../components/TextField";
import { authErrorMessage } from "./auth-errors";

export function RegisterPage() {
  const { status, signUp } = useAuth();
  const navigate = useNavigate();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });
  const [error, setError] = useState<string>();

  if (status === "authenticated") return <Navigate to="/rodada" replace />;

  const submit = form.handleSubmit(async (input) => {
    setError(undefined);
    try {
      await signUp(input);
      void navigate("/boloes", { replace: true });
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  });

  const { errors } = form.formState;
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col pb-8">
      <PageHeader
        title={
          <>
            BORA MONTAR
            <br />
            TEU MURO.
          </>
        }
        subtitle="Cria a conta, entra no bolão da galera e cola teus palpites antes da bola rolar."
        backTo="/entrar"
      />
      <form
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4 px-6"
        noValidate
      >
        <TextField
          label="Como a galera te chama"
          autoComplete="nickname"
          error={errors.name?.message}
          {...form.register("name")}
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register("email")}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          error={errors.password?.message}
          {...form.register("password")}
        />
        {error && (
          <p role="alert" className="text-sm text-fluor-pink">
            {error}
          </p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          CRIAR CONTA
        </Button>
        <p className="text-center text-[15px] text-muted">
          Já tem conta?{" "}
          <Link to="/entrar" className="font-bold text-fluor-orange">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
