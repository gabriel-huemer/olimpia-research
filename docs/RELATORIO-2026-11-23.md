# Relatório — plano geral (23/11/2026)

As dez frentes do plano estão na `stage`, um PR por vez. A `main` não foi alterada. Detalhes, decisões e cortes de cada frente:
[plano geral](superpowers/plans/2026-11-23-plano-geral.md).

## O que deu certo

| Frente | PR | Resultado |
|---|---|---|
| Análises | #7 | 5 abas e filtros lidos do banco |
| Auditoria | #8 | Lida de `log_auditoria`, com filtros e exportação |
| Operadores e Visão geral | #9 | Cadastro, código e desempenho reais (V006) |
| App | #10 | Código conferido no servidor; funciona sem internet depois da primeira entrada |
| Pesquisas | #11 | Filtros, exportação e digitação manual (V007, V008) |
| Importação | #12 | .xlsx e .csv com prévia e erros por linha |
| Publicação | #13 | Página `/publico` só com o aprovado (V009) |
| Formulários | #15 | Versões reais; o app baixa a publicada |
| Conta e limpeza | #16 | Trocar senha, cancelada com motivo (V010), sem dados de exemplo no código |
| Hospedagem | #17 | Imagem, HTTPS, guia e variante Tailscale |

Testes na máquina: painel 72 unitários, 96 de integração e 22 de acesso; app 58. Todos passaram.

**Falha minha:** o PR #13 entrou na `stage` sem o CI ter rodado (só o SonarCloud e os testes locais), porque o script de merge
aceitava a lista vazia como verde. Corrigi o script (exige os 5 checks) e o PR #14 rodou o CI completo sobre a `stage` com o #13: passou.

## Exportação em três versões

Botão **Exportar relatório** nas 5 abas: resumo de 1 página (padrão), relatório (8) e apresentação (12), com prévia antes de baixar.
Decidido pelo Hugo: PDF nas três, só números, qualquer visitante exporta. Com isso saíram do modelo original as leituras e decisões
sugeridas. Também ficaram fora o texto livre "o que falta" (pode identificar pessoas) e o gasto por viagem (fórmula não validada).
Atrações usam nota de 1 a 5 e "% que avaliou", como na tela. A opção "PDF (imprimir)" saiu; a planilha Excel da aba continua.
Conferido com `oto_demo` em 1366 e 390 px (mês, ano, recorte vazio) e com listas cheias: 1, 8 e 12 páginas, sem corte.
Testes: 96 unitários, 108 de integração, 22 de acesso.

## O que precisa do Hugo

1. **Feito em 23/11:** `oto` e `oto_demo` migrados para a V010, com backup antes. Outras máquinas e o servidor ainda precisam de `make migrate` (em `oto-db/`).
2. **Decidido em 23/11 (Hugo):** as Análises são públicas, sem mínimo por recorte. O RF21 (aprovação) vale só para `/publico`.
3. **Levar a `stage` para a `main`** quando aprovar.
4. **Planilha real do cliente** para testar a importação.
5. **Hospedagem:** servidor, domínio e, se quiser, Tailscale. Desativar OTO482, OTO117 e OTO305 em produção.
6. **App:** gerar o APK na sua máquina (licenças do Android), configurar a assinatura e testar em um aparelho.
7. **Validar com o cliente:** escala das notas (5/3/1), mínimo de 5 respostas, meta diária, motivos de cancelamento, formato pedido
   pelo prefeito e se alguma pergunta é obrigatória.
8. **Banco em uso na sua máquina:** `dashboard/.env.local` aponta para o `oto_teste`; copie `.env.real.local` ou `.env.demo.local`.
9. **SonarCloud:** marcar como seguro o alerta de aleatoriedade em `oto-db/demo/popular_demo.py`.

## O que não está pronto ou não foi conferido

- Formulários: pergunta obrigatória, vigência futura, reordenar seções, remover opções e mais de uma pesquisa (RF05 parcial).
- Token do app é único para todos os aparelhos. Trocar a senha não derruba sessões abertas (até 8 horas).
- Cliquei no navegador em Publicação, `/publico`, Formulários e editor, `/conta` e Visão geral, sem erros. As outras telas com
  login foram testadas pela API e pelo build. O app não rodou em aparelho.
- O mínimo de 5 respostas em `/publico` vale para o indicador inteiro (e para cada cidade e cada nota), não para cada faixa ou
  estado: uma faixa com 1 pessoa dentro de um indicador grande ainda aparece.
- Importação sem planilha real; HTTPS e Tailscale sem servidor real.
