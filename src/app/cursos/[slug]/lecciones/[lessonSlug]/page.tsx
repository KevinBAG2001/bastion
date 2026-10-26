import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { completeLesson } from "@/actions/learning";
import { Button } from "@/components/ui/button";
import { MarkdownLite } from "@/lib/markdown-lite";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string; lessonSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const lesson = await prisma.lesson.findFirst({
    where: { slug: lessonSlug, course: { slug } },
  });
  return { title: lesson?.title ?? "Lección" };
}

export default async function LessonPage({ params }: Props) {
  const { slug, lessonSlug } = await params;
  const session = await auth();
  const userId = session!.user!.id;

  const lesson = await prisma.lesson.findFirst({
    where: { slug: lessonSlug, course: { slug } },
    include: {
      course: {
        include: {
          lessons: { orderBy: { sortOrder: "asc" }, select: { slug: true, title: true, id: true } },
        },
      },
    },
  });
  if (!lesson) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.courseId } },
  });
  if (!enrollment) notFound();

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
  });

  const lessonIndex = lesson.course.lessons.findIndex((l) => l.id === lesson.id);
  const next = lesson.course.lessons[lessonIndex + 1];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href={`/cursos/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← {lesson.course.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">{lesson.title}</h1>
      <p className="mt-2 text-muted">{lesson.summary}</p>

      <article className="mt-8 rounded-2xl border border-card-border bg-card/50 p-6 sm:p-8">
        <MarkdownLite content={lesson.content} />
      </article>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {!progress?.completed ? (
          <form
            action={async () => {
              "use server";
              await completeLesson(lesson.id);
            }}
          >
            <Button type="submit">Marcar lección como completada (+{lesson.xpReward} XP)</Button>
          </form>
        ) : (
          <p className="text-sm text-success">Lección completada. ¡Buen trabajo!</p>
        )}
        {next ? (
          <Link
            href={`/cursos/${slug}/lecciones/${next.slug}`}
            className="text-sm text-accent-soft hover:text-accent"
          >
            Siguiente: {next.title} →
          </Link>
        ) : (
          <Link href={`/cursos/${slug}/quiz`} className="text-sm text-accent-soft hover:text-accent">
            Ir a la evaluación final →
          </Link>
        )}
      </div>
    </div>
  );
}
