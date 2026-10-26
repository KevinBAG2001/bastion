import Link from "next/link";
import type { Difficulty } from "@prisma/client";

const difficultyLabel: Record<Difficulty, string> = {
  PRINCIPIANTE: "Principiante",
  INTERMEDIO: "Intermedio",
  AVANZADO: "Avanzado",
};

type Props = {
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  lessonCount: number;
  progressPercent?: number;
  enrolled?: boolean;
};

export function CourseCard({
  slug,
  title,
  description,
  difficulty,
  lessonCount,
  progressPercent = 0,
  enrolled,
}: Props) {
  return (
    <article className="group flex flex-col rounded-2xl border border-card-border bg-card/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-indigo-500/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent-soft">
          {difficultyLabel[difficulty]}
        </span>
        <span className="text-xs text-muted">{lessonCount} lecciones</span>
      </div>
      <h3 className="text-lg font-semibold leading-snug">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{description}</p>
      {enrolled && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Progreso</span>
            <span>{progressPercent}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-card-border"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-teal-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
      <Link
        href={`/cursos/${slug}`}
        className="mt-5 inline-flex text-sm font-medium text-accent-soft hover:text-accent"
      >
        {enrolled ? "Continuar aprendiendo →" : "Ver curso →"}
      </Link>
    </article>
  );
}
