/// UI copy (pt-BR) taken from the prototype.
abstract final class AppStrings {
  static const appName = 'OTO Pesquisador';

  // Access
  static const heroTitle = 'Pesquisa de\nDemanda Turística';
  static const heroSubtitle = 'Observatório de Turismo de Olímpia · 2026';
  static const heroInstitution =
      'Prefeitura da Estância Turística de Olímpia\nSecretaria de Turismo';
  static const loginTitle = 'Entrar como pesquisador';
  static const loginDescription =
      'Digite o código individual fornecido pela Secretaria de Turismo.';
  static const loginCodeLabel = 'CÓDIGO DO PESQUISADOR';
  static const loginButton = 'Entrar';
  static const loginHelp = 'Esqueceu o código? Fale com a coordenação do OTO.';
  static const loginInvalid =
      'Código não encontrado. Confira com a coordenação do OTO.';

  // Home
  static const greeting = 'Olá,';
  static const awaitingSync = 'Aguardando sincronização';
  static const surveysUnit = 'pesquisas';
  static const surveyUnit = 'pesquisa';
  static const viewQueue = 'Ver fila';
  static const savedOfflineHint =
      'Tudo salvo no aparelho. Enviaremos assim que houver internet.';
  static const savedOnlineHint =
      'Internet disponível. Enviando as pesquisas pendentes.';
  static const allSyncedHint = 'Nenhuma pesquisa pendente. Tudo enviado.';
  static const newSurvey = '+ Nova pesquisa';
  static const today = 'Hoje';
  static const collected = 'coletadas';
  static const withAlert = 'Com alerta';
  static const suspiciousData = 'dados suspeitos';
  static const todayCollections = 'Coletas de hoje';
  static const noCollectionsToday = 'Nenhuma pesquisa concluída hoje.';
  static const complete = 'completa';
  static const logout = 'Sair';

  // Connectivity
  static const online = 'Online';
  static const offline = 'Offline';

  // Survey
  static const newSurveyTitle = 'Nova pesquisa';
  static const section = 'Seção';
  static const of10 = 'de';
  static const savedOnDevice = 'Salvo no aparelho ✓';
  static const back = 'Voltar';
  static const nextSection = 'Próxima seção';
  static const reviewSurvey = 'Revisar pesquisa';
  static const backToReview = 'Voltar à revisão';
  static const multipleHint = 'Pode marcar mais de um';
  static const correct = 'Corrigir';
  static const keepAndFlag = 'Manter e sinalizar';
  static const flagged = 'Sinalizada para curadoria';
  static const leaveTitle = 'Sair da pesquisa?';
  static const leaveBody =
      'As respostas ficam salvas no aparelho. Você pode continuar depois tocando em "Nova pesquisa".';
  static const leaveConfirm = 'Sair';
  static const leaveCancel = 'Continuar';
  static const showingCitiesOf = 'Mostrando só cidades de';
  static const noCityFound = 'Nenhuma cidade encontrada';
  static const nightsDayUseValue = '0';
  static String conditionalNote(String label) =>
      '→ Aparece porque marcou "$label"';
  static String bulkRemaining(int n, String value) =>
      'Marcar os $n restantes como "$value"';

  // Review
  static const reviewTitle = 'Revisão';
  static const reviewHeading = 'Confira antes de salvar';
  static const reviewSubtitle = 'Toque em uma seção para editar.';
  static String flaggedCount(int n) =>
      n == 1 ? '1 resposta sinalizada' : '$n respostas sinalizadas';
  static const flaggedBody =
      'Elas serão salvas normalmente e enviadas para a curadoria do gestor.';
  static const saveSurvey = 'Salvar pesquisa';
  static String unanswered(int n) =>
      n == 1 ? '1 sem resposta' : '$n sem resposta';
  static String alertsCount(int n) => '$n alertas';
  static const researcher = 'Pesquisador: ';
  static const start = 'Início';
  static const end = 'Fim';
  static const location = 'Local: ';

  // Saved
  static String savedTitle(String protocol) => 'Pesquisa $protocol salva';
  static const savedOfflineA =
      'Você está offline. A pesquisa ficou guardada no aparelho e será ';
  static const savedOfflineB = 'enviada automaticamente';
  static const savedOfflineC = ' quando houver internet.';
  static const savedOnlineA =
      'A pesquisa ficou guardada no aparelho e está sendo ';
  static const savedOnlineB = 'enviada agora';
  static const savedOnlineC = '. Nenhuma ação é necessária.';
  static String inQueue(int n) =>
      n == 1 ? '1 pesquisa na fila' : '$n pesquisas na fila';
  static const noDataLost = 'Nenhum dado será perdido';
  static const backHome = 'Voltar ao início';

  // Sync
  static const syncTitle = 'Sincronização';
  static const syncSending = 'Internet detectada · enviando…';
  static const syncOffline = 'Sem internet · aguardando conexão';
  static const syncDone = 'Tudo sincronizado';
  static const syncIdle = 'Online · fila pronta para envio';
  static String syncProgress(int sent, int total) => '$sent de $total enviadas';
  static String batchesOf(int n) => 'Em lotes de $n';
  static const syncEmpty = 'Nenhuma pesquisa concluída ainda.';
  static const syncRetry = 'Tentar agora';
  static String collectedAt(String hm) => 'Coletada $hm';
  static String sentAt(String hm) => 'Enviada $hm';
  static String sentAtLong(String hm) => 'enviada às $hm';
  static const sentToCuration = 'Enviada para curadoria';
  static String suspicious(int n) =>
      n == 1 ? '1 resposta suspeita' : '$n respostas suspeitas';

  // Tags
  static const tagPending = 'Pendente';
  static const tagAlert = 'Alerta';
  static const tagSynced = 'Sincronizada';
  static const tagQueued = 'Na fila';
  static const tagSending = 'Enviando…';
  static const tagInReview = 'Em revisão';
  static const tagInconsistency = 'Inconsistência';
  static const tagError = 'Falhou';

  static const exterior = 'Exterior';
  static const noCity = 'Origem não informada';
}
