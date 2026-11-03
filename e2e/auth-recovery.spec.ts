import { expect, test } from "@playwright/test";

const password = "Basti0n!2026x";
const newPassword = "NuevaBasti0n!2027y";

test.describe("Recuperación de contraseña", () => {
  test("solicitud → enlace → nueva contraseña → login", async ({ page, request }) => {
    const email = `recuperacion-${Date.now()}@ejemplo.test`;

    const registro = await request.post("/api/auth/register", {
      data: { name: "Recuperación Prueba", email, password },
      headers: { origin: "http://127.0.0.1:3000" },
    });
    expect(registro.ok()).toBeTruthy();

    const verificacion = await request.get(
      `/api/auth/test-utils?email=${encodeURIComponent(email)}&tipo=VERIFICACION_CORREO`,
    );
    expect(verificacion.ok()).toBeTruthy();

    await page.goto("/recuperar-contrasena");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByRole("button", { name: "Enviar enlace de recuperación" }).click();
    await expect(page.getByRole("status")).toContainText("Si el correo está registrado");

    const tokenRes = await request.get(
      `/api/auth/test-utils?email=${encodeURIComponent(email)}&tipo=RECUPERACION_CONTRASENA&accion=token`,
    );
    expect(tokenRes.ok()).toBeTruthy();
    const { token } = (await tokenRes.json()) as { token: string };

    await page.goto(`/restablecer-contrasena?token=${encodeURIComponent(token)}`);
    await page.getByLabel("Nueva contraseña").fill(newPassword);
    await page.getByRole("button", { name: "Guardar nueva contraseña" }).click();
    await expect(page).toHaveURL(/iniciar-sesion/);
    await expect(page.getByText("Contraseña actualizada")).toBeVisible();

    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(newPassword);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/panel/);
  });
});
