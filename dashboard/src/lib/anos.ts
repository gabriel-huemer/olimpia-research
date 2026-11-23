import { getDbPool } from "@/lib/db";

export async function anosComColeta(): Promise<number[]> {
  const { rows } = await getDbPool().query(
    `SELECT DISTINCT extract(year FROM iniciada_em AT TIME ZONE 'America/Sao_Paulo')::int AS ano
       FROM oto.pesquisa ORDER BY 1 DESC LIMIT 10`
  );
  return rows.map((l) => l.ano);
}
