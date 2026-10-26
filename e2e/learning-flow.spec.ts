import { expect, test } from "@playwright/test";

const email = `estudiante-${Date.now()}@ejemplo.test`;
const password = "Bastion2026";

test.describe("Flujo de aprendizaje", () => {
  test("registro → inscripción → lección → quiz → progreso", async ({ page }) => {
    await page.goto("/registro");
    await page.getByLabel("Nombre").fill("Ana Prueba");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/iniciar-sesion/);

    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/panel/);

    await page.goto("/cursos");
    await page.getByRole("link", { name: /Ver curso →/ }).first().click();
    await page.getByRole("button", { name: "Inscribirme en este curso" }).click();
    await page.getByRole("link", { name: /Comenzar primera lección/ }).click();
    await page.getByRole("button", { name: /Marcar lección como completada/ }).click();
    await expect(page.getByText("Lección completada")).toBeVisible();

    await page.goto("/cursos/fundamentos-ciberseguridad");
    await page.getByRole("link", { name: "Ir al cuestionario →" }).click();

    for (let q = 0; q < 3; q += 1) {
      await page.locator('input[type="radio"]').nth(q * 4).check();
    }
    await page.getByRole("button", { name: "Enviar respuestas" }).click();
    await expect(page.getByText(/Aprobaste|Sigue practicando/)).toBeVisible();

    await page.goto("/panel");
    await expect(page.getByText("Ana Prueba")).toBeVisible();
  });
});
