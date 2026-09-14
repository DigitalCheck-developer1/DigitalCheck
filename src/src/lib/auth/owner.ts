import { prisma } from "@/lib/db/prisma";
import type { User } from "@prisma/client";

export async function grantOwnerPrivilegesIfNeeded(user: User): Promise<User> {
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
  if (!ownerEmail || user.email.toLowerCase() !== ownerEmail) return user;
  if (user.plan === "PRO" && user.isAdmin) return user;

  return prisma.user.update({
    where: { id: user.id },
    data: { plan: "PRO", isAdmin: true },
  });
}
