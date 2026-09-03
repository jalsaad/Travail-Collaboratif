export {};

declare module "next-auth" {
  interface Session {
    userId: string;
    isSuperAdmin: boolean;
    /// Compte de demonstration : lecture seule, cf. lib/demo-mode.ts.
    isDemo: boolean;
  }

  interface User {
    isSuperAdmin: boolean;
    isDemo: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    isSuperAdmin: boolean;
    isDemo: boolean;
  }
}
