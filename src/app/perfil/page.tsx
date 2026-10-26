import type { Metadata } from "next";
import { auth } from "@/auth";
import { levelProgress, xpForLevel, xpToNextLevel } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Mi perfil",
};

export default async function ProfilePage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user!.id },
    include: {
      achievements: { include: { achievement: true }, orderBy: { earnedAt: "desc" } },
      enrollments: { include: { course: true } },
      quizAttempts: { orderBy: { createdAt: "desc" }, take: 5, include: { quiz: true } },
    },
  });

  const pct = Math.round(levelProgress(user.xp) * 100);
  const nextLevelXp = xpForLevel(user.level + 1);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold">Perfil</h1>
      <p className="mt-2 text-muted">Tu identidad y progreso en Bastion.</p>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-card-border bg-card/60 p-6">
          <h2 className="text-sm font-medium text-muted">Datos</h2>
          <p className="mt-3 text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="mt-4 text-xs text-muted">
            Miembro desde {user.createdAt.toLocaleDateString("es-MX")}
          </p>
        </div>
        <div className="rounded-2xl border border-card-border bg-card/60 p-6">
          <h2 className="text-sm font-medium text-muted">Gamificación</h2>
          <p className="mt-3 text-3xl font-bold text-accent-soft">Nivel {user.level}</p>
          <p className="text-sm text-muted">{user.xp} XP totales</p>
          <div className="mt-4 h-2 rounded-full bg-card-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-teal-400"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {xpToNextLevel(user.xp)} XP para nivel {user.level + 1} ({nextLevelXp} XP)
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Logros</h2>
        {user.achievements.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aún no has desbloqueado logros.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {user.achievements.map((ua) => (
              <li
                key={ua.achievementId}
                className="rounded-xl border border-card-border bg-card/40 p-4"
              >
                <p className="font-medium">{ua.achievement.title}</p>
                <p className="text-sm text-muted">{ua.achievement.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Cursos inscritos</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {user.enrollments.map((e) => (
            <li key={e.courseId} className="flex justify-between rounded-lg bg-card/40 px-4 py-2">
              <span>{e.course.title}</span>
              <span className="text-muted">
                {e.completedAt ? "Completado" : "En progreso"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Últimos cuestionarios</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {user.quizAttempts.map((attempt) => (
            <li key={attempt.id} className="flex justify-between rounded-lg bg-card/40 px-4 py-2">
              <span>{attempt.quiz.title}</span>
              <span className={attempt.passed ? "text-success" : "text-warning"}>
                {attempt.score}/{attempt.total}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
