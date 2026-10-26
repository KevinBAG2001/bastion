"use client";

import { useState } from "react";
import { submitQuiz } from "@/actions/learning";
import { Button } from "@/components/ui/button";

type ClientQuestion = {
  id: string;
  text: string;
  options: { id: string; text: string }[];
};

type ResultDetail = {
  questionId: string;
  correct: boolean;
  explanation: string;
};

export function QuizPlayer({
  quizId,
  questions,
  courseSlug,
}: {
  quizId: string;
  questions: ClientQuestion[];
  courseSlug: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    score: number;
    total: number;
    passed: boolean;
    details: ResultDetail[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    for (const question of questions) {
      const value = formData.get(question.id);
      if (typeof value === "string") {
        payload[question.id] = value;
      }
    }
    const response = await submitQuiz({ quizId, answers: payload });
    setLoading(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setResult({
      score: response.score,
      total: response.total,
      passed: response.passed,
      details: response.details,
    });
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div
          className={`rounded-2xl border p-5 ${
            result.passed
              ? "border-success/40 bg-success/10"
              : "border-warning/40 bg-warning/10"
          }`}
        >
          <h2 className="text-xl font-semibold">
            {result.passed ? "¡Aprobaste!" : "Sigue practicando"}
          </h2>
          <p className="mt-1 text-muted">
            Obtuviste {result.score} de {result.total} respuestas correctas.
          </p>
        </div>
        <ul className="space-y-4">
          {questions.map((q) => {
            const detail = result.details.find((d) => d.questionId === q.id);
            return (
              <li
                key={q.id}
                className="rounded-xl border border-card-border bg-card/50 p-4"
              >
                <p className="font-medium">{q.text}</p>
                <p
                  className={`mt-2 text-sm ${
                    detail?.correct ? "text-success" : "text-warning"
                  }`}
                >
                  {detail?.correct ? "Correcto" : "Incorrecto"}
                </p>
                <p className="mt-2 text-sm text-muted">{detail?.explanation}</p>
              </li>
            );
          })}
        </ul>
        <a href={`/cursos/${courseSlug}`} className="text-sm text-accent-soft hover:text-accent">
          Volver al curso →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}
      {questions.map((question, index) => (
        <fieldset
          key={question.id}
          className="rounded-2xl border border-card-border bg-card/50 p-5"
        >
          <legend className="px-1 text-base font-medium">
            {index + 1}. {question.text}
          </legend>
          <div className="mt-4 space-y-2">
            {question.options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2 hover:border-card-border"
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  required
                  className="mt-1"
                  onChange={() =>
                    setAnswers((prev) => ({ ...prev, [question.id]: option.id }))
                  }
                />
                <span className="text-sm leading-relaxed">{option.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <Button type="submit" disabled={loading}>
        {loading ? "Enviando…" : "Enviar respuestas"}
      </Button>
    </form>
  );
}
