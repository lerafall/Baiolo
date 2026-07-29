export type AdminAccount = {
  id: string;
  email: string | null;
  name: string;
  avatar: string;
  role: string;
  provider: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
};
