import type { Metadata } from "next";
import { auth } from "@/auth";
import { CourseCard } from "@/components/course-card";
import { getCourseProgressPercent } from "@/lib/course-progress";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Catálogo de cursos",
};

export default async function CoursesPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { lessons: true } } },
    }),
    prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } }),
  ]);

  const enrolledSet = new Set(enrollments.map((e) => e.courseId));
  const progressList = await Promise.all(
    courses
      .filter((c) => enrolledSet.has(c.id))
      .map(async (c) => [c.id, await getCourseProgressPercent(userId, c.id)] as const),
  );
  const progressMap = Object.fromEntries(progressList);

  const grouped = {
    PRINCIPIANTE: courses.filter((c) => c.difficulty === "PRINCIPIANTE"),
    INTERMEDIO: courses.filter((c) => c.difficulty === "INTERMEDIO"),
    AVANZADO: courses.filter((c) => c.difficulty === "AVANZADO"),
  };

  const labels = {
    PRINCIPIANTE: "Principiante",
    INTERMEDIO: "Intermedio",
    AVANZADO: "Avanzado",
  } as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold">Catálogo de cursos</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Elige una ruta según tu nivel. Cada curso incluye lecciones guiadas y una evaluación
        final con retroalimentación.
      </p>

      {(Object.keys(grouped) as Array<keyof typeof grouped>).map((key) =>
        grouped[key].length > 0 ? (
          <section key={key} className="mt-10">
            <h2 className="mb-4 text-lg font-medium text-accent-soft">{labels[key]}</h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {grouped[key].map((course) => (
                <CourseCard
                  key={course.id}
                  slug={course.slug}
                  title={course.title}
                  description={course.description}
                  difficulty={course.difficulty}
                  lessonCount={course._count.lessons}
                  enrolled={enrolledSet.has(course.id)}
                  progressPercent={progressMap[course.id]}
                />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
