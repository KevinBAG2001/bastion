import { expect, test } from "@playwright/test";

const email = `2fa-${Date.now()}@ejemplo.test`;
const password = "Basti0n!2026x";

test.describe("Verificación en dos pasos (TOTP)", () => {
  test("activación, login en dos fases y desactivación", async ({ page, request }) => {
    await page.goto("/registro");
    await page.getByLabel("Nombre").fill("Usuario 2FA");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/iniciar-sesion/);

    const verificacion = await request.get(
      `/api/auth/test-utils?email=${encodeURIComponent(email)}&tipo=VERIFICACION_CORREO`,
    );
    expect(verificacion.ok()).toBeTruthy();

    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/panel/);

    await page.goto("/perfil/seguridad");
    await page.getByRole("button", { name: "Activar verificación en dos pasos" }).click();
    await expect(page.getByAltText("Código QR para app autenticadora")).toBeVisible();

    const totpResp = await request.get(
      `/api/auth/test-utils?email=${encodeURIComponent(email)}&accion=totp-generar`,
    );
    expect(totpResp.ok()).toBeTruthy();
    const { token } = await totpResp.json();

    await page.getByLabel("Código de confirmación (6 dígitos)").fill(token);
    await page.getByRole("button", { name: "Confirmar activación" }).click();
    await expect(page.getByText("Estado: activa")).toBeVisible();
    await expect(page.getByText("Códigos de respaldo")).toBeVisible();

    await page.goto("/panel");
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByText(/Verificación en dos pasos activada/)).toBeVisible();

    const totpLogin = await request.get(
      `/api/auth/test-utils?email=${encodeURIComponent(email)}&accion=totp-generar`,
    );
    const { token: tokenLogin } = await totpLogin.json();
    await page.getByLabel("Código de verificación").fill(tokenLogin);
    await page.getByRole("button", { name: "Confirmar e ingresar" }).click();
    await expect(page).toHaveURL(/panel/);

    await page.goto("/perfil/seguridad");
    const totpOff = await request.get(
      `/api/auth/test-utils?email=${encodeURIComponent(email)}&accion=totp-generar`,
    );
    const { token: tokenOff } = await totpOff.json();
    await page.getByPlaceholder("Contraseña").fill(password);
    await page.getByPlaceholder("Código TOTP").fill(tokenOff);
    await page.getByRole("button", { name: "Desactivar" }).click();
    await expect(page.getByText(/desactivada/i)).toBeVisible();
  });
});
