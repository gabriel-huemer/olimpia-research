import assert from "node:assert/strict";
import test from "node:test";
import { origemPermitida, destinoSeguro } from "../src/lib/auth/origem.ts";

test("POST com Origin igual ao Host e aceito", () => {
  assert.equal(origemPermitida({ origin: "https://oto.olimpia.sp.gov.br", host: "oto.olimpia.sp.gov.br" }), true);
  assert.equal(origemPermitida({ origin: "http://localhost:3000", host: "localhost:3000" }), true);
});

test("Origin de outro site e recusada (CSRF)", () => {
  assert.equal(origemPermitida({ origin: "https://evil.example", host: "oto.olimpia.sp.gov.br" }), false);
  assert.equal(origemPermitida({ origin: "https://oto.olimpia.sp.gov.br.evil.example", host: "oto.olimpia.sp.gov.br" }), false);
  assert.equal(origemPermitida({ origin: "null", host: "oto.olimpia.sp.gov.br" }), false);
});

test("sem Origin usa Referer; sem nenhum dos dois, recusa", () => {
  assert.equal(origemPermitida({ referer: "https://oto.olimpia.sp.gov.br/sistema/usuarios", host: "oto.olimpia.sp.gov.br" }), true);
  assert.equal(origemPermitida({ referer: "https://evil.example/x", host: "oto.olimpia.sp.gov.br" }), false);
  assert.equal(origemPermitida({ host: "oto.olimpia.sp.gov.br" }), false);
});

test("redirecionamento pos-login so aceita caminho interno (open redirect)", () => {
  assert.equal(destinoSeguro("/coleta/pesquisas"), "/coleta/pesquisas");
  assert.equal(destinoSeguro("/sistema/usuarios?x=1"), "/sistema/usuarios?x=1");
  assert.equal(destinoSeguro("https://evil.example"), "/analises/panorama");
  assert.equal(destinoSeguro("//evil.example"), "/analises/panorama");
  assert.equal(destinoSeguro("/\\evil.example"), "/analises/panorama");
  assert.equal(destinoSeguro("javascript:alert(1)"), "/analises/panorama");
  assert.equal(destinoSeguro(undefined), "/analises/panorama");
  assert.equal(destinoSeguro("/login"), "/analises/panorama");
});
