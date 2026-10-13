import type {
  CreateUserCommand,
  UserCredentials,
  UserIdentity,
  UsersGateway,
} from "@bolao/core/domain";

/**
 * Fake da porta das contas, escrito à mão.
 *
 * Guarda as chamadas porque parte do que se prova aqui é quantas vezes a senha
 * foi comparada e com qual hash: a equivalência dos dois ramos do login é uma
 * promessa sobre o que foi chamado, não sobre o valor devolvido.
 */
export interface FakeUsersGateway extends UsersGateway {
  readonly createCalls: CreateUserCommand[];
  readonly credentialsCalls: string[];
  readonly findByIdCalls: number[];
  readonly existsCalls: number[];
}

export interface FakeUsersSetup {
  /** O que a criação devolve. `null` significa e-mail já usado. */
  created?: UserIdentity | null;
  /** Erro para a criação lançar, no lugar de devolver. */
  createThrows?: Error;
  credentials?: UserCredentials | null;
  /** Fila de respostas para chamadas sucessivas de `findCredentialsByEmail`. */
  credentialsQueue?: (UserCredentials | null)[];
  identity?: UserIdentity | null;
  exists?: boolean;
}

export function fakeUsersGateway(setup: FakeUsersSetup = {}): FakeUsersGateway {
  const createCalls: CreateUserCommand[] = [];
  const credentialsCalls: string[] = [];
  const findByIdCalls: number[] = [];
  const existsCalls: number[] = [];
  const queue = [...(setup.credentialsQueue ?? [])];

  return {
    createCalls,
    credentialsCalls,
    findByIdCalls,
    existsCalls,
    createUnlessEmailTaken(command) {
      createCalls.push(command);
      if (setup.createThrows) return Promise.reject(setup.createThrows);
      return Promise.resolve(setup.created ?? null);
    },
    findCredentialsByEmail(email) {
      credentialsCalls.push(email);
      if (queue.length > 0) return Promise.resolve(queue.shift() ?? null);
      return Promise.resolve(setup.credentials ?? null);
    },
    findById(id) {
      findByIdCalls.push(id);
      return Promise.resolve(setup.identity ?? null);
    },
    exists(id) {
      existsCalls.push(id);
      return Promise.resolve(setup.exists ?? false);
    },
  };
}
