import { expect, test } from "@playwright/test";

const email = `estudiante-${Date.now()}@ejemplo.test`;
const password = "Basti0n!2026x";

test.describe("Flujo de aprendizaje", () => {
  test("registro → verificación → inscripción → lección → quiz → progreso", async ({
    page,
    request,
  }) => {
    // --- Registro ---
    await page.goto("/registro");
    await page.getByLabel("Nombre").fill("Ana Prueba");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // El registro redirige a login con mensaje de verificación
    await expect(page).toHaveURL(/iniciar-sesion/);

    // La contraseña NUNCA debe aparecer en la URL (CWE-598)
    expect(page.url()).not.toContain("password");
    expect(page.url()).not.toContain(encodeURIComponent(password));

    // --- Verificación de correo (vía endpoint de test, habilitado con BASTION_E2E=1) ---
    const verificacion = await request.get(
      `/api/auth/test-utils?email=${encodeURIComponent(email)}&tipo=VERIFICACION_CORREO`,
    );
    expect(verificacion.ok()).toBeTruthy();

    // --- Inicio de sesión ---
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/panel/);

    // La contraseña NUNCA debe aparecer en la URL
    expect(page.url()).not.toContain("password");

    // --- Inscripción ---
    await page.goto("/cursos");
    await page.getByRole("link", { name: /Ver curso →/ }).first().click();
    await page.getByRole("button", { name: "Inscribirme en este curso" }).click();
    await page.getByRole("link", { name: /Comenzar primera lección/ }).click();

    // --- Lección ---
    await page.getByRole("button", { name: /Marcar lección como completada/ }).click();
    await expect(page.getByText("Lección completada")).toBeVisible();

    // --- Quiz ---
    await page.goto("/cursos/fundamentos-ciberseguridad");
    await page.getByRole("link", { name: "Ir al cuestionario →" }).click();

    for (let q = 0; q < 3; q += 1) {
      await page.locator('input[type="radio"]').nth(q * 4).check();
    }
    await page.getByRole("button", { name: "Enviar respuestas" }).click();
    await expect(page.getByText(/Aprobaste|Sigue practicando/)).toBeVisible();

    // --- Progreso ---
    await page.goto("/panel");
    await expect(page.getByText("Ana Prueba")).toBeVisible();
  });
});
