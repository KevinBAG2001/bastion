/**
 * Pruebas de resolución segura de IP del cliente (A3).
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  IP_CLIENTE_SIN_PROXY,
  extraerIpDesdeXForwardedFor,
  ipClienteDesdeEncabezados,
  ipClienteDesdeRequest,
  resolverSaltosProxyConfiables,
} from "./ip-cliente";

describe("ip-cliente — sin proxy de confianza", () => {
  afterEach(() => {
    delete process.env.BASTION_TRUSTED_PROXY;
  });

  it("ignora X-Forwarded-For falso y usa la llave directo", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.50, 198.51.100.1",
    });
    expect(ipClienteDesdeEncabezados(headers)).toBe(IP_CLIENTE_SIN_PROXY);
  });

  it("la llave no cambia con o sin encabezado spoofeado", () => {
    const sinSpoof = ipClienteDesdeEncabezados(new Headers());
    const conSpoof = ipClienteDesdeEncabezados(
      new Headers({ "x-forwarded-for": "203.0.113.99" }),
    );
    expect(sinSpoof).toBe(conSpoof);
    expect(sinSpoof).toBe("directo");
  });

  it("ipClienteDesdeRequest aplica la misma regla", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "203.0.113.50" },
    });
    expect(ipClienteDesdeRequest(req)).toBe(IP_CLIENTE_SIN_PROXY);
  });
});

describe("ip-cliente — con proxy de confianza", () => {
  afterEach(() => {
    delete process.env.BASTION_TRUSTED_PROXY;
  });

  it("resuelve saltos desde BASTION_TRUSTED_PROXY", () => {
    process.env.BASTION_TRUSTED_PROXY = "2";
    expect(resolverSaltosProxyConfiables()).toBe(2);
  });

  it("toma la IP correcta con un salto de proxy", () => {
    process.env.BASTION_TRUSTED_PROXY = "1";
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });
    expect(ipClienteDesdeEncabezados(headers)).toBe("203.0.113.10");
  });

  it("extrae desde XFF con dos saltos", () => {
    expect(
      extraerIpDesdeXForwardedFor("203.0.113.10, 10.0.0.1, 10.0.0.2", 2),
    ).toBe("203.0.113.10");
  });

  it("usa X-Real-IP si no hay XFF", () => {
    process.env.BASTION_TRUSTED_PROXY = "1";
    const headers = new Headers({ "x-real-ip": "203.0.113.20" });
    expect(ipClienteDesdeEncabezados(headers)).toBe("203.0.113.20");
  });
});
