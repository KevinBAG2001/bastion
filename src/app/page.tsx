import { ButtonLink } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function LandingPage() {
  const featured = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    take: 3,
    include: { _count: { select: { lessons: true } } },
  });

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="animate-fade-up max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent-soft">
            Plataforma educativa
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Aprende ciberseguridad con claridad, práctica y confianza
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            Bastion te guía paso a paso en español latinoamericano: lecciones
            interactivas, ejemplos reales, cuestionarios con retroalimentación y
            un panel que celebra tu progreso con XP y logros.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/registro">Comenzar gratis</ButtonLink>
            <ButtonLink href="/iniciar-sesion" variant="secondary">
              Ya tengo cuenta
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="border-y border-card-border bg-card/30 py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
          {[
            {
              title: "Ruta clara por nivel",
              text: "Cursos de principiante a intermedio sobre phishing, contraseñas, MFA y más.",
            },
            {
              title: "Evalúa lo aprendido",
              text: "Cuestionarios calificados en el servidor con explicaciones al instante.",
            },
            {
              title: "Progreso que motiva",
              text: "XP, niveles y logros que refuerzan hábitos seguros en el día a día.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-card-border bg-card/60 p-6">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Cursos destacados</h2>
            <p className="mt-1 text-muted">Contenido real, sin relleno.</p>
          </div>
          <ButtonLink href="/registro" variant="ghost" className="hidden sm:inline-flex">
            Ver catálogo completo →
          </ButtonLink>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {featured.map((course) => (
            <article
              key={course.id}
              className="rounded-2xl border border-card-border bg-card/70 p-5"
            >
              <h3 className="font-semibold">{course.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{course.description}</p>
              <p className="mt-3 text-xs text-muted">
                {course._count.lessons} lecciones · {course.difficulty.toLowerCase()}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
