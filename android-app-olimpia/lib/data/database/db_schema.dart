/// Table and column names + DDL. Keeping names here avoids string duplication in datasources.
abstract final class DbSchema {
  static const meta = 'meta';
  static const sections = 'sections';
  static const questions = 'questions';
  static const options = 'question_options';
  static const cities = 'cities';
  static const researchers = 'researchers';
  static const session = 'session';
  static const surveys = 'surveys';
  static const answers = 'answers';
  static const answerHistory = 'answer_history';
  static const flags = 'flags';

  static const create = [
    'CREATE TABLE $meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    '''CREATE TABLE $sections (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      review_title TEXT NOT NULL,
      layout TEXT NOT NULL,
      searchable INTEGER NOT NULL DEFAULT 0,
      search_placeholder TEXT,
      bulk_value TEXT
    )''',
    '''CREATE TABLE $questions (
      key TEXT PRIMARY KEY,
      section_id INTEGER NOT NULL REFERENCES $sections(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      source_text TEXT NOT NULL,
      xlsx_column INTEGER NOT NULL,
      config TEXT NOT NULL
    )''',
    '''CREATE TABLE $options (
      question_key TEXT NOT NULL REFERENCES $questions(key) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      value TEXT NOT NULL,
      label TEXT NOT NULL,
      tone TEXT,
      uf TEXT,
      PRIMARY KEY (question_key, value)
    )''',
    '''CREATE TABLE $cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      uf TEXT NOT NULL,
      search_name TEXT NOT NULL
    )''',
    'CREATE INDEX idx_cities_uf_search ON $cities (uf, search_name)',
    'CREATE INDEX idx_cities_search ON $cities (search_name)',
    '''CREATE TABLE $researchers (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL
    )''',
    '''CREATE TABLE $session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      researcher_code TEXT NOT NULL REFERENCES $researchers(code),
      logged_at TEXT NOT NULL
    )''',
    '''CREATE TABLE $surveys (
      id TEXT PRIMARY KEY,
      protocol INTEGER NOT NULL,
      researcher_code TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      finished_at TEXT,
      synced_at TEXT,
      device_id TEXT NOT NULL,
      questionnaire_version INTEGER NOT NULL,
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      UNIQUE (researcher_code, protocol)
    )''',
    'CREATE INDEX idx_surveys_status ON $surveys (status)',
    '''CREATE TABLE $answers (
      survey_id TEXT NOT NULL REFERENCES $surveys(id) ON DELETE CASCADE,
      question_key TEXT NOT NULL,
      value TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (survey_id, question_key)
    )''',
    '''CREATE TABLE $answerHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id TEXT NOT NULL REFERENCES $surveys(id) ON DELETE CASCADE,
      question_key TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_at TEXT NOT NULL,
      changed_by TEXT NOT NULL
    )''',
    '''CREATE TABLE $flags (
      survey_id TEXT NOT NULL REFERENCES $surveys(id) ON DELETE CASCADE,
      rule_id TEXT NOT NULL,
      question_key TEXT NOT NULL,
      section_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      review_tag TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (survey_id, rule_id)
    )''',
  ];
}
