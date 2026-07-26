export {};

declare module "next-auth" {
  interface Session {
    userId: string;
    isSuperAdmin: boolean;
  }

  interface User {
    isSuperAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    isSuperAdmin: boolean;
  }
}
