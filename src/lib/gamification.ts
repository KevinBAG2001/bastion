/** XP required to reach a given level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) ** 2 * 100;
}

/** Level derived from total XP. */
export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level += 1;
  }
  return level;
}

/** Progress within current level (0–1). */
export function levelProgress(xp: number): number {
  const level = levelFromXp(xp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  if (next === current) return 1;
  return (xp - current) / (next - current);
}

export function xpToNextLevel(xp: number): number {
  const level = levelFromXp(xp);
  return xpForLevel(level + 1) - xp;
}

export const XP_LESSON_COMPLETE = 30;
export const XP_QUIZ_PASS = 50;
export const XP_COURSE_COMPLETE = 100;

export type AchievementSlug =
  | "primera-leccion"
  | "primer-quiz"
  | "curso-completado"
  | "nivel-cinco"
  | "explorador";

export const ACHIEVEMENT_DEFINITIONS: Record<
  AchievementSlug,
  { title: string; description: string; xpBonus: number; icon: string }
> = {
  "primera-leccion": {
    title: "Primer paso",
    description: "Completaste tu primera lección en Bastion.",
    xpBonus: 25,
    icon: "footprints",
  },
  "primer-quiz": {
    title: "Evaluado",
    description: "Aprobaste tu primer cuestionario.",
    xpBonus: 40,
    icon: "check-circle",
  },
  "curso-completado": {
    title: "Módulo dominado",
    description: "Terminaste un curso completo con su evaluación.",
    xpBonus: 75,
    icon: "trophy",
  },
  "nivel-cinco": {
    title: "Guardián en formación",
    description: "Alcanzaste el nivel 5.",
    xpBonus: 100,
    icon: "star",
  },
  explorador: {
    title: "Explorador",
    description: "Te inscribiste en tres cursos diferentes.",
    xpBonus: 60,
    icon: "compass",
  },
};
