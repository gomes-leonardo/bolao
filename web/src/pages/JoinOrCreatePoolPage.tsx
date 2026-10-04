import {
  createPoolSchema,
  type CreatePoolInput,
  joinPoolSchema,
  type JoinPoolInput,
  type PoolSummary,
} from "@bolao/core/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { Button, ButtonLink } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Paper } from "../components/Paper";
import { errorMessage } from "../components/QueryError";
import { TextField } from "../components/TextField";
import { useCurrentPool } from "../features/pools/useCurrentPool";
import { useCreatePool, useJoinPool } from "../features/pools/usePools";

function JoinForm({ onJoined }: { onJoined: (pool: PoolSummary) => void }) {
  const join = useJoinPool();
  const form = useForm<JoinPoolInput>({
    resolver: zodResolver(joinPoolSchema),
  });
  const submit = form.handleSubmit((input) =>
    join.mutate(input, { onSuccess: onJoined }),
  );

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-3.5"
      noValidate
    >
      <TextField
        label="Código do bolão"
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={8}
        className="h-16 border-fluor-orange bg-paper font-display text-4xl font-black tracking-[0.3em] text-ink uppercase tabular-nums stretch-condensed"
        hint="8 letras ou números, do jeito que a galera mandou."
        error={
          form.formState.errors.inviteCode?.message ??
          (join.error ? errorMessage(join.error) : undefined)
        }
        {...form.register("inviteCode")}
      />
      <Button type="submit" disabled={join.isPending}>
        {join.isPending ? "ENTRANDO…" : "ENTRAR NO BOLÃO"}
      </Button>
    </form>
  );
}

function CreateForm({ onCreated }: { onCreated: (pool: PoolSummary) => void }) {
  const create = useCreatePool();
  const form = useForm<CreatePoolInput>({
    resolver: zodResolver(createPoolSchema),
  });
  const submit = form.handleSubmit((input) =>
    create.mutate(input, { onSuccess: onCreated }),
  );

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-3.5"
      noValidate
    >
      <TextField
        label="Nome do bolão"
        placeholder="Fut de Quinta"
        error={
          form.formState.errors.name?.message ??
          (create.error ? errorMessage(create.error) : undefined)
        }
        {...form.register("name")}
      />
      <Button type="submit" variant="outline" disabled={create.isPending}>
        {create.isPending ? "CRIANDO…" : "CRIAR BOLÃO"}
      </Button>
    </form>
  );
}

function CreatedPool({ pool }: { pool: PoolSummary }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(pool.inviteCode).then(
      () => setCopied(true),
      () => setCopied(false),
    );

  return (
    <div className="flex flex-col gap-4 px-5">
      <Paper
        tilt="left"
        tape="left"
        className="flex flex-col items-center gap-2 px-4 py-6"
      >
        <span className="text-xs font-bold tracking-[0.08em] text-ink-muted">
          MANDA NO ZAP
        </span>
        <span className="font-display text-[44px] leading-none font-black tracking-[0.12em] tabular-nums stretch-condensed">
          {pool.inviteCode}
        </span>
        <span className="text-sm">
          Quem tiver esse código entra no {pool.name}.
        </span>
      </Paper>
      <Button variant="outline" onClick={() => void copy()}>
        {copied ? "CÓDIGO COPIADO" : "COPIAR CÓDIGO"}
      </Button>
      <ButtonLink to={`/boloes/${pool.id}/ranking`}>IR PRO BOLÃO</ButtonLink>
    </div>
  );
}

export function JoinOrCreatePoolPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { selectPool } = useCurrentPool();
  const [created, setCreated] = useState<PoolSummary | null>(null);

  const focus = (pool: PoolSummary) => {
    selectPool(pool.id);
    void navigate("/rodada");
  };

  if (created) {
    return (
      <>
        <PageHeader
          title="BOLÃO CRIADO"
          subtitle="Agora chama a galera."
          backTo="/boloes"
        />
        <CreatedPool pool={created} />
      </>
    );
  }

  const creatingFirst = params.get("criar") === "1";
  const sections = [
    <section key="join" className="flex flex-col gap-3">
      <h2 className="font-display text-2xl font-black stretch-semi">
        {creatingFirst ? "OU TEM CÓDIGO?" : "TEM CÓDIGO?"}
      </h2>
      <JoinForm onJoined={focus} />
    </section>,
    <section key="create" className="flex flex-col gap-3">
      <h2 className="font-display text-2xl font-black stretch-semi">
        {creatingFirst ? "CRIA O TEU" : "OU CRIA O TEU"}
      </h2>
      <CreateForm
        onCreated={(pool) => {
          selectPool(pool.id);
          setCreated(pool);
        }}
      />
    </section>,
  ];

  return (
    <>
      <PageHeader title="BORA PRO BOLÃO" backTo="/boloes" />
      <div className="flex flex-col gap-8 px-5">
        {creatingFirst ? sections.reverse() : sections}
      </div>
    </>
  );
}
