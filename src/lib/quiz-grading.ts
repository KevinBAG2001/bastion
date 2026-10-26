export type GradedAnswer = {
  questionId: string;
  selectedOptionId: string;
  correct: boolean;
  explanation: string;
};

export type GradeQuizInput = {
  questions: Array<{
    id: string;
    explanation: string;
    options: Array<{ id: string; isCorrect: boolean }>;
  }>;
  answers: Record<string, string>;
};

export type GradeQuizResult = {
  score: number;
  total: number;
  passed: boolean;
  details: GradedAnswer[];
};

const PASS_THRESHOLD = 0.7;

export function gradeQuiz(input: GradeQuizInput): GradeQuizResult {
  const details: GradedAnswer[] = [];
  let score = 0;

  for (const question of input.questions) {
    const selectedOptionId = input.answers[question.id] ?? "";
    const selected = question.options.find((o) => o.id === selectedOptionId);
    const correctOption = question.options.find((o) => o.isCorrect);
    const correct = Boolean(selected?.isCorrect);

    if (correct) score += 1;

    details.push({
      questionId: question.id,
      selectedOptionId,
      correct,
      explanation: question.explanation,
    });

    if (!selected && correctOption) {
      details[details.length - 1].selectedOptionId = "";
    }
  }

  const total = input.questions.length;
  const passed = total > 0 && score / total >= PASS_THRESHOLD;

  return { score, total, passed, details };
}

export function sanitizeQuestionsForClient<
  T extends {
    id: string;
    text: string;
    sortOrder: number;
    options: Array<{ id: string; text: string; isCorrect?: boolean }>;
  },
>(questions: T[]) {
  return questions
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((q) => ({
      id: q.id,
      text: q.text,
      sortOrder: q.sortOrder,
      options: q.options.map(({ id, text }) => ({ id, text })),
    }));
}
