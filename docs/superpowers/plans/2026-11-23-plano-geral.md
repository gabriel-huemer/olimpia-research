# Plano geral: deixar o OTO pronto

Pedido do Hugo (2026-11-23): executar todas as frentes, **um PR por vez na `stage`**, e no fim relatar o que deu certo,
o que depende dele e um resumo. Hugo está offline: na dúvida, o caminho mais seguro, anotado aqui.

## O que é "pronto"
- Nenhuma tela mostra número inventado como se fosse real.
- Todo botão grava no banco ou não existe.
- Toda rota exige a área certa, com teste de permissão.

## Regras
Testes primeiro; integração só no `oto_teste`; `git add` com caminhos explícitos; merge só com CI verde; nada na `main`, sem
force-push, sem carregar `oto_demo`, sem criar contas em serviços externos. Migrações novas a partir da V006.
Frente que falhar 3 vezes pela mesma causa fica em PR aberto e o plano segue.

## Frentes
- [x] 1. Análises: as quatro abas e os filtros lidos do banco
- [x] 2. Auditoria lida de `log_auditoria`
- [x] 3. Operadores e Visão geral no banco
- [x] 4. App: login do pesquisador validado no servidor e cancelar entrevista (RF23)
- [x] 5. Pesquisas: lista com filtros, inserção manual (RF17)
- [x] 6. Importação de planilhas históricas (RF09)
- [x] 7. Publicação de resultados (RF21)
- [ ] 8. Formulários e versões no banco (RF05); app baixa o publicado
- [ ] 9. Conta (trocar a própria senha), limpeza dos dados de exemplo, SonarCloud
- [ ] 10. Hospedagem: contêineres, HTTPS, backup; guia de Tailscale
- [ ] 11. Relatório final

## Status
### Frente 1 — Análises
- Feito: as 5 abas e os filtros vêm do banco; exportação usa os números da tela.
- Decisões padrão: nota Ótimo=5, Regular=3, Ruim=1; cidade com menos de 5 respostas vira "Outras cidades" e não é filtro;
  texto livre só para quem tem login. O aviso de que "renda não é coletada" saiu: o formulário coleta.
### Frente 2 — Auditoria
- Feito: lê `log_auditoria`, com filtros por usuário, ação, período e protocolo, paginação e exportação.
- Decisões padrão: só a área Sistema consulta; senha, hash, token e código de acesso nunca aparecem.
### Frente 3 — Operadores e Visão geral
- Feito: cadastro, código, ativar/desativar, desempenho e indicadores lidos do banco. Migração V006 (`codigo_antigo`).
- Decisões padrão: só a área Sistema cadastra e vê o código; atraso = mais de 1 dia sem envio; após redefinir, o código antigo
  ainda identifica pesquisas que estavam na fila; a meta diária de 60 saiu (não há meta cadastrada).
- Pendência: rodar `make migrate` nos bancos `oto` e `oto_demo` (aqui só o `oto_teste` foi migrado).
### Frente 4 — App
- Feito: o código é conferido em `/api/v1/pesquisador`; depois da primeira entrada funciona sem internet; código desativado ou
  trocado para de entrar; cancelar entrevista apaga o rascunho.
- Incompleto: o RF23 pede que a cancelada fique registrada com o motivo; isso ficou para a frente 9.
- Decisões padrão: com servidor configurado, a lista de demonstração não serve para entrar; 20 códigos errados em 15 minutos
  bloqueiam o IP.
- Cortado: token por pesquisador. O `SYNC_API_TOKEN` continua igual para todos os aparelhos.
### Frente 5 — Pesquisas
- Feito: lista paginada com filtros reais, exportação com todas as respostas e inserção manual com o formulário publicado (RF17).
  Migrações V007 e V008 (origem MANUAL, canal, autor, protocolo `MAN-0001`).
- Decisões padrão: na digitação manual nenhuma pergunta é obrigatória; valor fora da faixa entra sinalizado e vai para a revisão;
  quem tem Coleta pode inserir; exportação limitada a 5.000 linhas.
### Frente 6 — Importação
- Feito: .xlsx e .csv, com prévia sem gravar, erros por linha, duplicatas ignoradas e gravação em uma transação só. Reconhece a
  planilha de tabulação de 2026 (layout do seed do app) e um modelo baixável. 500 linhas completas levaram 15 s.
- Decisões padrão: linha com erro não entra; valor fora da faixa entra sinalizado; arquivo repetido é recusado; limite de 3.000
  linhas e 8 MB; sem coluna de data, vale a data de chegada; não há desfazer.
- Não verificado: nenhuma planilha real do cliente foi testada, porque nenhuma foi entregue.
### Frente 7 — Publicação
- Feito: seleção gravada e auditada (migração V009), pré-visualização idêntica ao público, página `/publico` para incorporar no
  site, com planilha e impressão em PDF. As demais páginas não podem ser incorporadas em outro site.
- Decisões padrão: nada publicado; indicador com menos de 5 respostas e texto livre nunca aparecem.
- Decisão do Hugo: as Análises continuam públicas, como já combinado, mas o RF21 diz que nada aparece sem aprovação. Ou as
  Análises passam a exigir login, ou o RF21 vale só para `/publico`. Nada foi escondido.
