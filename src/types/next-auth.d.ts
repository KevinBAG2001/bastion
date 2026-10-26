import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    xp?: number;
    level?: number;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      xp: number;
      level: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    xp?: number;
    level?: number;
  }
}
