import { prisma } from "@/lib/prisma";

export async function getCourseProgressPercent(userId: string, courseId: string) {
  const [lessonCount, completedCount, quiz] = await Promise.all([
    prisma.lesson.count({ where: { courseId } }),
    prisma.lessonProgress.count({
      where: { userId, completed: true, lesson: { courseId } },
    }),
    prisma.quiz.findUnique({ where: { courseId }, select: { id: true } }),
  ]);

  let quizDone = 0;
  if (quiz) {
    const passed = await prisma.quizAttempt.findFirst({
      where: { userId, quizId: quiz.id, passed: true },
    });
    if (passed) quizDone = 1;
  }

  const totalSteps = lessonCount + (quiz ? 1 : 0);
  if (totalSteps === 0) return 0;
  return Math.round(((completedCount + quizDone) / totalSteps) * 100);
}
