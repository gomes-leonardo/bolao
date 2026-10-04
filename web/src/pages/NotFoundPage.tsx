import { ButtonLink } from "../components/Button";
import { PageHeader } from "../components/PageHeader";

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="PASSOU LONGE" subtitle="Essa página não existe." />
      <div className="px-5">
        <ButtonLink to="/rodada">VOLTA PRA RODADA</ButtonLink>
      </div>
    </>
  );
}
