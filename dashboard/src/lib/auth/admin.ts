// Gestão de perfis de acesso e usuários do painel (só quem tem a área Sistema).
import type { PoolClient } from "pg";
import { getDbPool, withAuditTransaction } from "@/lib/db";
import { AREAS, type Area } from "./permissoes";
import { gerarHash, validarForcaSenha } from "./senha";

export class ErroAdmin extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

export interface PerfilDto {
  id: number;
  nome: string;
  padrao: boolean;
  areas: Record<Area, boolean>;
  usuarios: number;
}

export interface UsuarioDto {
  id: string;
  nome: string;
  email: string | null;
  codigoAcesso: string | null;
  ativo: boolean;
  perfil: { id: number; nome: string };
  criadoEm: string;
}

const COLUNA: Record<Area, string> = { analises: "acesso_analises", coleta: "acesso_coleta", sistema: "acesso_sistema" };

/** Lê só booleanos verdadeiros das áreas conhecidas; o resto vira false. */
export function areasDe(entrada: unknown): Record<Area, boolean> {
  const o = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  return Object.fromEntries(AREAS.map((a) => [a, o[a] === true])) as Record<Area, boolean>;
}

function nomeValido(nome: unknown): string {
  const n = typeof nome === "string" ? nome.trim().replace(/\s+/g, " ") : "";
  if (!n || n.length > 60) throw new ErroAdmin(400, "Nome do perfil deve ter entre 1 e 60 caracteres.");
  return n;
}

function traduzErroPg(e: unknown): never {
  const codigo = (e as { code?: string }).code;
  if (e instanceof ErroAdmin) throw e;
  if (codigo === "23505") throw new ErroAdmin(409, "Já existe um registro com esse nome/e-mail.");
  if (codigo === "P0001") throw new ErroAdmin(409, "Perfis padrão não podem ser alterados.");
  if (codigo === "23503") throw new ErroAdmin(400, "Perfil inexistente.");
  throw e;
}

export async function listarPerfis(): Promise<PerfilDto[]> {
  const r = await getDbPool().query(
    `SELECT p.id, p.nome, p.padrao, p.acesso_analises, p.acesso_coleta, p.acesso_sistema,
            (SELECT count(*)::int FROM oto.usuario u WHERE u.perfil_acesso_id = p.id) AS usuarios
       FROM oto.perfil_acesso p ORDER BY p.padrao DESC, p.nome`
  );
  return r.rows.map((l) => ({
    id: l.id,
    nome: l.nome,
    padrao: l.padrao,
    areas: { analises: l.acesso_analises, coleta: l.acesso_coleta, sistema: l.acesso_sistema },
    usuarios: l.usuarios,
  }));
}

export async function criarPerfil(autorId: string, nome: unknown, areas: unknown): Promise<PerfilDto> {
  const n = nomeValido(nome);
  const a = areasDe(areas);
  try {
    return await withAuditTransaction(autorId, async (c) => {
      const r = await c.query(
        `INSERT INTO oto.perfil_acesso (nome, acesso_analises, acesso_coleta, acesso_sistema)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [n, a.analises, a.coleta, a.sistema]
      );
      return { id: r.rows[0].id, nome: n, padrao: false, areas: a, usuarios: 0 };
    });
  } catch (e) {
    traduzErroPg(e);
  }
}

export async function editarPerfil(autorId: string, id: number, mudancas: { nome?: unknown; areas?: unknown }) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (mudancas.nome !== undefined) {
    vals.push(nomeValido(mudancas.nome));
    sets.push(`nome = $${vals.length}`);
  }
  if (mudancas.areas !== undefined) {
    const a = areasDe(mudancas.areas);
    for (const area of AREAS) {
      vals.push(a[area]);
      sets.push(`${COLUNA[area]} = $${vals.length}`);
    }
  }
  if (sets.length === 0) throw new ErroAdmin(400, "Nada para alterar.");
  try {
    await withAuditTransaction(autorId, async (c) => {
      const atual = await c.query(`SELECT padrao FROM oto.perfil_acesso WHERE id = $1 FOR UPDATE`, [id]);
      if (!atual.rows[0]) throw new ErroAdmin(404, "Perfil não encontrado.");
      if (atual.rows[0].padrao) throw new ErroAdmin(409, "Perfis padrão não podem ser alterados.");
      vals.push(id);
      await c.query(`UPDATE oto.perfil_acesso SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
      await garantirAlgumAdmin(c);
    });
  } catch (e) {
    traduzErroPg(e);
  }
}

export async function listarUsuarios(): Promise<UsuarioDto[]> {
  const r = await getDbPool().query(
    `SELECT u.id, u.nome, u.email, u.codigo_acesso, u.ativo, u.criado_em, p.id AS perfil_id, p.nome AS perfil_nome
       FROM oto.usuario u JOIN oto.perfil_acesso p ON p.id = u.perfil_acesso_id
      ORDER BY u.ativo DESC, u.nome`
  );
  return r.rows.map((l) => ({
    id: l.id,
    nome: l.nome,
    email: l.email,
    codigoAcesso: l.codigo_acesso,
    ativo: l.ativo,
    perfil: { id: l.perfil_id, nome: l.perfil_nome },
    criadoEm: new Date(l.criado_em).toISOString(),
  }));
}

// Sem quantificadores aninhados; o tamanho é checado antes (evita backtracking caro).
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export async function criarUsuario(
  autorId: string,
  dados: { nome?: unknown; email?: unknown; perfilId?: unknown; senha?: unknown }
): Promise<UsuarioDto> {
  const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
  const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase() : "";
  const perfilId = Number(dados.perfilId);
  const senha = typeof dados.senha === "string" ? dados.senha : "";
  if (!nome || nome.length > 150) throw new ErroAdmin(400, "Informe o nome (até 150 caracteres).");
  if (email.length > 200 || !EMAIL.test(email)) throw new ErroAdmin(400, "E-mail inválido.");
  if (!Number.isInteger(perfilId)) throw new ErroAdmin(400, "Escolha um perfil.");
  const forca = validarForcaSenha(senha);
  if (!forca.ok) throw new ErroAdmin(400, `Senha fraca: ${forca.motivo}`);
  const hash = await gerarHash(senha);
  try {
    return await withAuditTransaction(autorId, async (c) => {
      const p = await c.query(`SELECT id, nome, (acesso_coleta OR acesso_sistema) AS faz_login FROM oto.perfil_acesso WHERE id = $1`, [perfilId]);
      if (!p.rows[0]) throw new ErroAdmin(400, "Perfil inexistente.");
      if (p.rows[0].nome === "PESQUISADOR") {
        throw new ErroAdmin(400, "Pesquisadores são cadastrados pelo código de acesso do app, não por aqui.");
      }
      if (!p.rows[0].faz_login) {
        throw new ErroAdmin(400, "Este perfil só vê Análises, que é pública: não precisa de conta.");
      }
      // Enum legado: ADMINISTRADOR para quem gerencia o sistema; os demais entram como VISUALIZADOR.
      const r = await c.query(
        `INSERT INTO oto.usuario (nome, perfil, email, senha_hash, perfil_acesso_id)
         SELECT $1, CASE WHEN acesso_sistema THEN 'ADMINISTRADOR' ELSE 'VISUALIZADOR' END::oto.perfil_usuario, $2, $3, id
           FROM oto.perfil_acesso WHERE id = $4
         RETURNING id, criado_em`,
        [nome, email, hash, perfilId]
      );
      return {
        id: r.rows[0].id,
        nome,
        email,
        codigoAcesso: null,
        ativo: true,
        perfil: { id: perfilId, nome: p.rows[0].nome },
        criadoEm: new Date(r.rows[0].criado_em).toISOString(),
      };
    });
  } catch (e) {
    traduzErroPg(e);
  }
}

export async function editarUsuario(autorId: string, id: string, mudancas: { ativo?: unknown; perfilId?: unknown }) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (mudancas.ativo !== undefined) {
    if (typeof mudancas.ativo !== "boolean") throw new ErroAdmin(400, "ativo deve ser true/false.");
    vals.push(mudancas.ativo);
    sets.push(`ativo = $${vals.length}`);
  }
  if (mudancas.perfilId !== undefined) {
    const p = Number(mudancas.perfilId);
    if (!Number.isInteger(p)) throw new ErroAdmin(400, "Perfil inválido.");
    vals.push(p);
    sets.push(`perfil_acesso_id = $${vals.length}`);
  }
  if (sets.length === 0) throw new ErroAdmin(400, "Nada para alterar.");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErroAdmin(404, "Usuário não encontrado.");
  try {
    await withAuditTransaction(autorId, async (c) => {
      vals.push(id);
      const r = await c.query(`UPDATE oto.usuario SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
      if (r.rowCount === 0) throw new ErroAdmin(404, "Usuário não encontrado.");
      if (id === autorId) {
        const eu = await c.query(
          `SELECT u.ativo AND p.acesso_sistema AS ok FROM oto.usuario u
             JOIN oto.perfil_acesso p ON p.id = u.perfil_acesso_id WHERE u.id = $1`,
          [id]
        );
        if (!eu.rows[0]?.ok) throw new ErroAdmin(409, "Você não pode desativar a si mesmo nem tirar seu próprio acesso a Sistema.");
      }
      await garantirAlgumAdmin(c);
    });
  } catch (e) {
    traduzErroPg(e);
  }
}

/** Nunca deixa o painel sem ninguém capaz de administrá-lo. */
async function garantirAlgumAdmin(c: PoolClient) {
  const r = await c.query(
    `SELECT count(*)::int AS n FROM oto.usuario u JOIN oto.perfil_acesso p ON p.id = u.perfil_acesso_id
      WHERE u.ativo AND p.acesso_sistema AND u.email IS NOT NULL`
  );
  if (r.rows[0].n === 0) throw new ErroAdmin(409, "A alteração deixaria o painel sem nenhum administrador ativo.");
}
