import { expect, test } from "@playwright/test";
import { cabecerasTestUtils } from "./helpers/cabeceras-test-utils";

const email = `sesion-${Date.now()}@ejemplo.test`;
const password = "Basti0n!2026x";
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test.describe("Invalidación de sessionVersion (C1)", () => {
  test("sesión A sigue activa hasta que B cierra todas las sesiones", async ({
    browser,
    request,
  }) => {
    const setup = await browser.newPage();
    await setup.goto("/registro");
    await setup.getByLabel("Nombre").fill("Usuario Sesión");
    await setup.getByLabel("Correo electrónico").fill(email);
    await setup.getByLabel("Contraseña").fill(password);
    await setup.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(setup).toHaveURL(/iniciar-sesion/);
    await setup.close();

    const verificacion = await request.get(
      `${origin}/api/auth/test-utils?email=${encodeURIComponent(email)}&tipo=VERIFICACION_CORREO`,
      { headers: cabecerasTestUtils() },
    );
    expect(verificacion.ok()).toBeTruthy();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    for (const page of [pageA, pageB]) {
      await page.goto("/iniciar-sesion");
      await page.getByLabel("Correo electrónico").fill(email);
      await page.getByLabel("Contraseña").fill(password);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await expect(page).toHaveURL(/panel/);
    }

    await pageA.goto("/panel");
    await expect(pageA.getByText("Tu panel en Bastion")).toBeVisible();

    const cookiesB = await contextB.cookies();
    const cookieHeader = cookiesB.map((c) => `${c.name}=${c.value}`).join("; ");

    const cierre = await request.post(`${origin}/api/auth/cerrar-todas-sesiones`, {
      headers: {
        Origin: origin,
        Cookie: cookieHeader,
      },
    });
    expect(cierre.ok()).toBeTruthy();

    await pageA.goto("/panel");
    await expect(pageA).toHaveURL(/iniciar-sesion/);

    await contextA.close();
    await contextB.close();
  });
});
