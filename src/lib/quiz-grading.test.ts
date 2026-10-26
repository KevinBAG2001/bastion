import { describe, expect, it } from "vitest";
import { gradeQuiz, sanitizeQuestionsForClient } from "./quiz-grading";

describe("gradeQuiz", () => {
  const questions = [
    {
      id: "q1",
      explanation: "Explicación 1",
      options: [
        { id: "a", isCorrect: true },
        { id: "b", isCorrect: false },
      ],
    },
    {
      id: "q2",
      explanation: "Explicación 2",
      options: [
        { id: "c", isCorrect: false },
        { id: "d", isCorrect: true },
      ],
    },
  ];

  it("grades all correct as passed", () => {
    const result = gradeQuiz({
      questions,
      answers: { q1: "a", q2: "d" },
    });
    expect(result.score).toBe(2);
    expect(result.passed).toBe(true);
  });

  it("fails below 70%", () => {
    const result = gradeQuiz({
      questions,
      answers: { q1: "b", q2: "d" },
    });
    expect(result.score).toBe(1);
    expect(result.passed).toBe(false);
  });

  it("strips correct flags for client", () => {
    const sanitized = sanitizeQuestionsForClient([
      {
        id: "q1",
        text: "Pregunta",
        sortOrder: 1,
        options: [
          { id: "a", text: "A", isCorrect: true },
          { id: "b", text: "B", isCorrect: false },
        ],
      },
    ]);
    expect(sanitized[0].options[0]).not.toHaveProperty("isCorrect");
  });
});
