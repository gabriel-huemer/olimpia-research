-- S05 - Locais de coleta e pesquisadores de teste (mesmos códigos do app: assets/seed/researchers.json).
-- Idempotente. Em produção, troque pelos pesquisadores reais (pelo painel Web).
SET search_path = oto, public;

INSERT INTO local_coleta (nome) VALUES
    ('Thermas dos Laranjais'),
    ('Hot Beach Olímpia'),
    ('Praça da Matriz')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO usuario (nome, perfil, codigo_acesso, local_padrao_id)
SELECT v.nome, 'PESQUISADOR', v.codigo, lc.id
FROM (VALUES
    ('Ana Souza',    'OTO482', 'Thermas dos Laranjais'),
    ('Bruno Lima',   'OTO117', 'Hot Beach Olímpia'),
    ('Carla Mendes', 'OTO305', 'Praça da Matriz')
) AS v(nome, codigo, local)
JOIN local_coleta lc ON lc.nome = v.local
ON CONFLICT (codigo_acesso) DO NOTHING;
