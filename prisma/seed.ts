import { PrismaClient } from "@prisma/client";
import { achievementSeeds, courses } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  for (const ach of achievementSeeds) {
    await prisma.achievement.upsert({
      where: { slug: ach.slug },
      create: ach,
      update: {
        title: ach.title,
        description: ach.description,
        xpBonus: ach.xpBonus,
        icon: ach.icon,
      },
    });
  }

  for (const course of courses) {
    const createdCourse = await prisma.course.upsert({
      where: { slug: course.slug },
      create: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        sortOrder: course.sortOrder,
      },
      update: {
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        sortOrder: course.sortOrder,
      },
    });

    for (const [index, lesson] of course.lessons.entries()) {
      await prisma.lesson.upsert({
        where: {
          courseId_slug: { courseId: createdCourse.id, slug: lesson.slug },
        },
        create: {
          courseId: createdCourse.id,
          slug: lesson.slug,
          title: lesson.title,
          summary: lesson.summary,
          content: lesson.content,
          sortOrder: index + 1,
        },
        update: {
          title: lesson.title,
          summary: lesson.summary,
          content: lesson.content,
          sortOrder: index + 1,
        },
      });
    }

    const quiz = await prisma.quiz.upsert({
      where: { courseId: createdCourse.id },
      create: {
        courseId: createdCourse.id,
        title: course.quizTitle,
      },
      update: { title: course.quizTitle },
    });

    await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });

    for (const [qIndex, question] of course.questions.entries()) {
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          text: question.text,
          explanation: question.explanation,
          sortOrder: qIndex + 1,
          options: {
            create: question.options.map((opt) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
            })),
          },
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
