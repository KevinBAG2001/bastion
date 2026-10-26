import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { enrollInCourse } from "@/actions/learning";
import { Button } from "@/components/ui/button";
import { getCourseProgressPercent } from "@/lib/course-progress";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug } });
  return { title: course?.title ?? "Curso" };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  const userId = session!.user!.id;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      lessons: { orderBy: { sortOrder: "asc" } },
      quiz: true,
    },
  });
  if (!course) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  const progress = enrollment
    ? await getCourseProgressPercent(userId, course.id)
    : 0;

  const completedLessons = enrollment
    ? await prisma.lessonProgress.findMany({
        where: { userId, completed: true, lesson: { courseId: course.id } },
        select: { lessonId: true },
      })
    : [];
  const completedSet = new Set(completedLessons.map((l) => l.lessonId));

  const firstLesson = course.lessons[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/cursos" className="text-sm text-muted hover:text-foreground">
        ← Volver al catálogo
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">{course.title}</h1>
      <p className="mt-3 text-muted">{course.description}</p>

      {!enrollment ? (
        <form
          action={async () => {
            "use server";
            await enrollInCourse(slug);
          }}
          className="mt-8"
        >
          <Button type="submit">Inscribirme en este curso</Button>
        </form>
      ) : (
        <div className="mt-8 rounded-2xl border border-card-border bg-card/60 p-5">
          <p className="text-sm text-muted">Tu progreso: {progress}%</p>
          {firstLesson && (
            <Link
              href={`/cursos/${slug}/lecciones/${firstLesson.slug}`}
              className="mt-3 inline-flex text-accent-soft hover:text-accent"
            >
              {progress > 0 ? "Continuar lecciones →" : "Comenzar primera lección →"}
            </Link>
          )}
        </div>
      )}

      <h2 className="mt-10 text-xl font-semibold">Lecciones</h2>
      <ol className="mt-4 space-y-3">
        {course.lessons.map((lesson) => (
          <li
            key={lesson.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-card-border bg-card/40 px-4 py-3"
          >
            <div>
              <p className="font-medium">{lesson.title}</p>
              <p className="text-sm text-muted">{lesson.summary}</p>
            </div>
            {enrollment ? (
              <Link
                href={`/cursos/${slug}/lecciones/${lesson.slug}`}
                className="shrink-0 text-sm text-accent-soft hover:text-accent"
              >
                {completedSet.has(lesson.id) ? "Repasar" : "Abrir"}
              </Link>
            ) : (
              <span className="text-xs text-muted">Inscríbete para acceder</span>
            )}
          </li>
        ))}
      </ol>

      {enrollment && course.quiz && (
        <div className="mt-10 rounded-2xl border border-accent/30 bg-accent/5 p-5">
          <h2 className="font-semibold">Evaluación final</h2>
          <p className="mt-1 text-sm text-muted">{course.quiz.title}</p>
          <Link
            href={`/cursos/${slug}/quiz`}
            className="mt-3 inline-flex text-sm font-medium text-accent-soft hover:text-accent"
          >
            Ir al cuestionario →
          </Link>
        </div>
      )}
    </div>
  );
}
