import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["**/dist/", "**/coverage/", "**/generated/", "**/node_modules/"],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: { allowDefaultProject: ["eslint.config.js"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["web/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  // A direção das dependências do ADR 0008, verificada por ferramenta em vez de
  // por combinado: o domínio não conhece framework nem banco. Dois objetos
  // porque o schema da regra é oneOf group/regex, e só o regex casa caminho
  // relativo como ../db.ts.
  {
    // A camada pura é o `domain` mais a regra que ele consome: `scoring` e
    // `match-status`. Sem eles no glob, `domain -> scoring -> qualquer coisa`
    // seria um caminho não vigiado.
    files: [
      "packages/core/src/domain/**/*.ts",
      "packages/core/src/scoring/**/*.ts",
      "packages/core/src/matches/match-status.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@nestjs",
                "@nestjs/**",
                "@prisma",
                "@prisma/**",
                "@bolao/core",
                "@bolao/core/**",
                // "Zero I/O" é promessa do ADR 0008; sem isto, só metade dela
                // seria verificada.
                "node:*",
              ],
              message:
                "O domínio não conhece framework, Prisma, I/O do Node, nem o próprio pacote pelo nome. Dentro do core as camadas se importam por caminho relativo (ADR 0008).",
            },
            {
              // O `group` casa pacote por nome; só o `regex` casa caminho
              // relativo. `adapters` está aqui porque é o vizinho mais próximo
              // e o atalho mais tentador: o adapter importa o Prisma como
              // valor, então um import desses arrastaria o client inteiro.
              regex:
                "(^|/)(db|prisma)\\.ts$|/generated/prisma(/|$)|(^|/)adapters(/|$)|(^|/)api/src(/|$)",
              message:
                "O domínio não importa o client do core nem um adapter. A dependência aponta para dentro: quem conhece o Postgres é packages/core/src/adapters, e quem o liga ao domínio é a borda (ADR 0008).",
            },
          ],
        },
      ],
      // `no-restricted-imports` visita só ImportDeclaration e os export-from;
      // não existe handler de ImportExpression, então `await import(...)`
      // passaria pela cerca inteira.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportExpression > Literal[value=/^(@nestjs|@prisma|@bolao|node:)|(^|\\/)(db|prisma)\\.ts$|(^|\\/)adapters(\\/|$)|(^|\\/)api\\/src(\\/|$)|\\/generated\\/prisma/]",
          message:
            "import() dinâmico não escapa a fronteira: o domínio não carrega framework, Prisma nem adapter, nem sob demanda (ADR 0008).",
        },
      ],
    },
  },
  { files: ["**/*.js"], extends: [tseslint.configs.disableTypeChecked] },
);
