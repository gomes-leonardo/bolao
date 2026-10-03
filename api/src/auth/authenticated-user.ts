export interface AuthenticatedUser {
  id: number;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}
