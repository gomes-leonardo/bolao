# 0007 · Identidade "Carimbou" (lambe-lambe)

**Status:** aceita · 2026-10-03

## Contexto

O pedido era a energia dos canais de streaming esportivo jovens do Brasil, sem nada genérico e sem
copiar marca nenhuma. A pesquisa de referências mostrou que o diferencial da CazéTV é a voz e a
participação, não o grafismo, e que o vernáculo gráfico de rua (lambe-lambe, carimbo) é pouco
explorado em apps de futebol.

## Decisão

Entre três direções desenhadas no Claude Design (Telão, Mosaico, Lambe), o Leo escolheu a **Lambe**,
com o nome **Carimbou**:

- **Visual:** cards de papel claro colados no asfalto, levemente tortos e presos com fita.
- **Cor:** laranja e rosa fluor fora das cores dos 20 clubes da Série A. "AO VIVO" nunca em vermelho.
- **Tipografia:** Anybody (variável na largura: condensada no placar, larga nos títulos) com Familjen
  Grotesk. Placar e ranking só com algarismos tabulares.
- **Assinatura:** o carimbo ("TRANCADO" no apito, "CRAVOU +3", "NA TRAVE +1", "PASSOU LONGE" no fim).
- **Escudos:** placeholders neutros com a sigla, porque escudos são marcas registradas dos clubes.

## Consequências

- Os tokens ficam no `@theme` do Tailwind 4 (`web/src/styles.css`), e as animações respeitam
  `prefers-reduced-motion`.
- O nome foi checado só por busca na web; falta consultar o INPI antes de tornar público.
