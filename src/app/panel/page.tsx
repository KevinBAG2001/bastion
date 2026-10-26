import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { CourseCard } from "@/components/course-card";
import { ButtonLink } from "@/components/ui/button";
import { getCourseProgressPercent } from "@/lib/course-progress";
import { levelProgress, xpToNextLevel } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Panel de aprendizaje",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const [user, enrollments, courses] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        achievements: { include: { achievement: true }, take: 4, orderBy: { earnedAt: "desc" } },
      },
    }),
    prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } }),
    prisma.course.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { lessons: true } } },
    }),
  ]);

  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  const enrolledCourses = courses.filter((c) => enrolledIds.has(c.id));

  const progressEntries = await Promise.all(
    enrolledCourses.map(async (course) => ({
      courseId: course.id,
      percent: await getCourseProgressPercent(userId, course.id),
    })),
  );
  const progressMap = Object.fromEntries(progressEntries.map((p) => [p.courseId, p.percent]));

  const progressPct = Math.round(levelProgress(user.xp) * 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-card-border bg-card/70 p-6">
          <p className="text-sm text-muted">Hola, {user.name}</p>
          <h1 className="mt-1 text-2xl font-semibold">Tu panel en Bastion</h1>
          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Nivel</p>
              <p className="text-4xl font-bold text-accent-soft">{user.level}</p>
            </div>
            <div className="min-w-[200px] flex-1">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>{user.xp} XP</span>
                <span>Faltan {xpToNextLevel(user.xp)} XP</span>
              </div>
              <div className="h-2 rounded-full bg-card-border">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-teal-400"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-card-border bg-card/70 p-6">
          <h2 className="font-semibold">Logros recientes</h2>
          {user.achievements.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Completa lecciones para desbloquear logros.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {user.achievements.map((ua) => (
                <li key={ua.achievementId} className="rounded-lg bg-background/40 px-3 py-2">
                  <span className="font-medium">{ua.achievement.title}</span>
                  <span className="block text-xs text-muted">{ua.achievement.description}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Tus cursos</h2>
        <ButtonLink href="/cursos" variant="secondary">
          Explorar catálogo
        </ButtonLink>
      </div>

      {enrolledCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-card-border p-10 text-center">
          <p className="text-muted">Aún no te has inscrito a un curso.</p>
          <ButtonLink href="/cursos" className="mt-4">
            Elegir mi primer curso
          </ButtonLink>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {enrolledCourses.map((course) => (
            <CourseCard
              key={course.id}
              slug={course.slug}
              title={course.title}
              description={course.description}
              difficulty={course.difficulty}
              lessonCount={course._count.lessons}
              enrolled
              progressPercent={progressMap[course.id] ?? 0}
            />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        ¿Necesitas repasar conceptos?{" "}
        <Link href="/cursos" className="text-accent-soft hover:text-accent">
          Revisa el catálogo completo
        </Link>
      </p>
    </div>
  );
}
