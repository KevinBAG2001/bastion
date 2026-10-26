import type { AchievementSlug } from "@/lib/gamification";
import { ACHIEVEMENT_DEFINITIONS, levelFromXp } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";

export async function grantAchievement(userId: string, slug: AchievementSlug) {
  const def = ACHIEVEMENT_DEFINITIONS[slug];
  const achievement = await prisma.achievement.findUnique({ where: { slug } });
  if (!achievement) return null;

  const existing = await prisma.userAchievement.findUnique({
    where: {
      userId_achievementId: { userId, achievementId: achievement.id },
    },
  });
  if (existing) return null;

  await prisma.$transaction(async (tx) => {
    await tx.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    });
    const updated = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: def.xpBonus } },
      select: { xp: true },
    });
    await tx.user.update({
      where: { id: userId },
      data: { level: levelFromXp(updated.xp) },
    });
  });

  return achievement;
}

export async function syncUserLevel(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true },
  });
  if (!user) return;
  const level = levelFromXp(user.xp);
  if (level !== user.level) {
    await prisma.user.update({ where: { id: userId }, data: { level } });
  }
  if (level >= 5) {
    await grantAchievement(userId, "nivel-cinco");
  }
}

export async function checkExploradorAchievement(userId: string) {
  const count = await prisma.enrollment.count({ where: { userId } });
  if (count >= 3) {
    await grantAchievement(userId, "explorador");
  }
}
