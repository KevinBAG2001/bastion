"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  grantAchievement,
  checkExploradorAchievement,
  syncUserLevel,
} from "@/lib/achievements";
import { XP_COURSE_COMPLETE, XP_LESSON_COMPLETE, XP_QUIZ_PASS } from "@/lib/gamification";
import { gradeQuiz } from "@/lib/quiz-grading";
import { prisma } from "@/lib/prisma";
import { quizSubmitSchema } from "@/lib/validations";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }
  return session.user.id;
}

export async function enrollInCourse(courseSlug: string) {
  const userId = await requireUserId();
  const course = await prisma.course.findUnique({ where: { slug: courseSlug } });
  if (!course) throw new Error("Curso no encontrado");

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId: course.id } },
    create: { userId, courseId: course.id },
    update: {},
  });

  await checkExploradorAchievement(userId);
  revalidatePath("/panel");
  revalidatePath(`/cursos/${courseSlug}`);
  return { ok: true };
}

export async function completeLesson(lessonId: string) {
  const userId = await requireUserId();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });
  if (!lesson) throw new Error("Lección no encontrada");

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId: lesson.courseId },
    },
  });
  if (!enrollment) throw new Error("Debes inscribirte al curso primero");

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
  if (existing?.completed) {
    return { ok: true, alreadyCompleted: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        completed: true,
        completedAt: new Date(),
      },
      update: { completed: true, completedAt: new Date() },
    });

    await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: lesson.xpReward || XP_LESSON_COMPLETE } },
    });
  });

  await syncUserLevel(userId);
  await grantAchievement(userId, "primera-leccion");

  revalidatePath("/panel");
  revalidatePath(`/cursos/${lesson.course.slug}`);
  return { ok: true };
}

export async function submitQuiz(input: { quizId: string; answers: Record<string, string> }) {
  const userId = await requireUserId();
  const parsed = quizSubmitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Respuestas inválidas." };
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: parsed.data.quizId },
    include: {
      course: true,
      questions: { include: { options: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!quiz) {
    return { ok: false as const, error: "Cuestionario no encontrado." };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId: quiz.courseId },
    },
  });
  if (!enrollment) {
    return { ok: false as const, error: "Debes inscribirte al curso." };
  }

  const result = gradeQuiz({
    questions: quiz.questions.map((q) => ({
      id: q.id,
      explanation: q.explanation,
      options: q.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect })),
    })),
    answers: parsed.data.answers,
  });

  await prisma.quizAttempt.create({
    data: {
      userId,
      quizId: quiz.id,
      score: result.score,
      total: result.total,
      passed: result.passed,
    },
  });

  if (result.passed) {
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: XP_QUIZ_PASS } },
    });
    await grantAchievement(userId, "primer-quiz");
  }

  const lessonCount = await prisma.lesson.count({
    where: { courseId: quiz.courseId },
  });
  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      completed: true,
      lesson: { courseId: quiz.courseId },
    },
  });

  if (result.passed && completedLessons >= lessonCount) {
    await prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId: quiz.courseId } },
      data: { completedAt: new Date() },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: XP_COURSE_COMPLETE } },
    });
    await grantAchievement(userId, "curso-completado");
  }

  await syncUserLevel(userId);

  revalidatePath("/panel");
  revalidatePath(`/cursos/${quiz.course.slug}/quiz`);

  return {
    ok: true as const,
    score: result.score,
    total: result.total,
    passed: result.passed,
    details: result.details,
  };
}
