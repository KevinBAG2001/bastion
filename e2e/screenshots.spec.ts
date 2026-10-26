import { expect, test } from "@playwright/test";
import path from "node:path";

const password = "Bastion2026";

test("capturas de interfaz", async ({ page, request }, testInfo) => {
  const viewport = testInfo.project.name;
  const dir = path.join("artifacts", "screenshots", viewport);
  const email = `captura-${viewport}-${Date.now()}@ejemplo.test`;

  await request.post("/api/auth/register", {
    data: { name: "Usuario Captura", email, password },
  });

  await page.goto("/");
  await page.screenshot({ path: path.join(dir, "landing.png"), fullPage: true });

  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/panel/);

  await page.screenshot({ path: path.join(dir, "dashboard.png"), fullPage: true });

  await page.goto("/cursos/fundamentos-ciberseguridad");
  await page.getByRole("button", { name: "Inscribirme en este curso" }).click();
  await page.goto("/cursos/fundamentos-ciberseguridad/lecciones/que-es-ciberseguridad");
  await page.screenshot({ path: path.join(dir, "lesson.png"), fullPage: true });

  await page.goto("/cursos/fundamentos-ciberseguridad/quiz");
  await page.screenshot({ path: path.join(dir, "quiz.png"), fullPage: true });
});
