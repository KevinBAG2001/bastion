import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { QuizPlayer } from "@/components/quiz/quiz-player";
import { sanitizeQuestionsForClient } from "@/lib/quiz-grading";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    include: { quiz: true },
  });
  return { title: course?.quiz?.title ?? "Cuestionario" };
}

export default async function QuizPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  const userId = session!.user!.id;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      quiz: {
        include: {
          questions: {
            include: { options: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
  if (!course?.quiz) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });
  if (!enrollment) notFound();

  const clientQuestions = sanitizeQuestionsForClient(course.quiz.questions);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href={`/cursos/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← {course.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">{course.quiz.title}</h1>
      <p className="mt-2 text-muted">
        Responde todas las preguntas. Necesitas al menos 70% para aprobar y ganar XP.
      </p>
      <div className="mt-8">
        <QuizPlayer quizId={course.quiz.id} questions={clientQuestions} courseSlug={slug} />
      </div>
    </div>
  );
}
