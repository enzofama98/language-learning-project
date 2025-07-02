-- =====================================================
-- SCHEMA COMPLETO DATABASE - ESEGUI TUTTO INSIEME
-- =====================================================

-- =====================================================
-- 1. FUNZIONI DI UTILITÀ
-- =====================================================

-- Funzione per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. TABELLE PRINCIPALI (se non esistono già)
-- =====================================================

-- Tabella anagrafica_codici (potrebbe già esistere)
CREATE TABLE IF NOT EXISTS anagrafica_codici (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codice VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    max_uses INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella codici_sbloccati (potrebbe già esistere)
CREATE TABLE IF NOT EXISTS codici_sbloccati (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    utente_mail VARCHAR(255),
    language_code VARCHAR(20) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    UNIQUE(user_id, language_code)
);

-- =====================================================
-- 3. NUOVE TABELLE PER CORSI
-- =====================================================

-- Tabella course_tabs (Schede/Tab del corso)
CREATE TABLE IF NOT EXISTS course_tabs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL,
    tab_name VARCHAR(100) NOT NULL,
    tab_type VARCHAR(50) NOT NULL,
    tab_icon VARCHAR(50),
    tab_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(course_code, tab_order),
    UNIQUE(course_code, tab_name)
);

-- Aggiungi foreign key solo se la tabella anagrafica_codici esiste
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'anagrafica_codici') THEN
        ALTER TABLE course_tabs 
        ADD CONSTRAINT fk_course_tabs_anagrafica 
        FOREIGN KEY (course_code) REFERENCES anagrafica_codici(codice) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Tabella course_content (Contenuti delle schede)
CREATE TABLE IF NOT EXISTS course_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tab_id UUID NOT NULL REFERENCES course_tabs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_data JSONB,
    content_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tab_id, content_order)
);

-- Tabella user_progress (Progresso utente nei contenuti)
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES course_content(id) ON DELETE CASCADE,
    progress_status VARCHAR(50) DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, content_id),
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CHECK (progress_status IN ('not_started', 'in_progress', 'completed'))
);

-- =====================================================
-- 4. INDICI PER PERFORMANCE
-- =====================================================

-- Indici per anagrafica_codici
CREATE INDEX IF NOT EXISTS idx_anagrafica_codici_active ON anagrafica_codici(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_anagrafica_codici_codice ON anagrafica_codici(codice);

-- Indici per codici_sbloccati
CREATE INDEX IF NOT EXISTS idx_codici_sbloccati_user_id ON codici_sbloccati(user_id);
CREATE INDEX IF NOT EXISTS idx_codici_sbloccati_language_code ON codici_sbloccati(language_code);

-- Indici per course_tabs
CREATE INDEX IF NOT EXISTS idx_course_tabs_course_code ON course_tabs(course_code);
CREATE INDEX IF NOT EXISTS idx_course_tabs_active ON course_tabs(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_course_tabs_order ON course_tabs(course_code, tab_order) WHERE active = true;

-- Indici per course_content
CREATE INDEX IF NOT EXISTS idx_course_content_tab_id ON course_content(tab_id);
CREATE INDEX IF NOT EXISTS idx_course_content_type ON course_content(content_type);
CREATE INDEX IF NOT EXISTS idx_course_content_order ON course_content(tab_id, content_order) WHERE active = true;

-- Indici per user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_content_id ON user_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(progress_status);

-- =====================================================
-- 5. TRIGGER PER AUTO-UPDATE
-- =====================================================

-- Trigger per anagrafica_codici
DROP TRIGGER IF EXISTS trigger_anagrafica_codici_updated_at ON anagrafica_codici;
CREATE TRIGGER trigger_anagrafica_codici_updated_at
    BEFORE UPDATE ON anagrafica_codici
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per course_tabs
DROP TRIGGER IF EXISTS trigger_course_tabs_updated_at ON course_tabs;
CREATE TRIGGER trigger_course_tabs_updated_at
    BEFORE UPDATE ON course_tabs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per course_content
DROP TRIGGER IF EXISTS trigger_course_content_updated_at ON course_content;
CREATE TRIGGER trigger_course_content_updated_at
    BEFORE UPDATE ON course_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Abilita RLS sulle nuove tabelle
ALTER TABLE course_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policies per course_tabs (lettura pubblica per tabs attivi)
DROP POLICY IF EXISTS "Lettura tabs corsi attivi" ON course_tabs;
CREATE POLICY "Lettura tabs corsi attivi" ON course_tabs
    FOR SELECT USING (active = true);

-- Policies per course_content (lettura pubblica per contenuti attivi)
DROP POLICY IF EXISTS "Lettura contenuti attivi" ON course_content;
CREATE POLICY "Lettura contenuti attivi" ON course_content
    FOR SELECT USING (active = true);

-- Policies per user_progress (solo i propri progressi)
DROP POLICY IF EXISTS "Utenti gestiscono solo i propri progressi" ON user_progress;
CREATE POLICY "Utenti gestiscono solo i propri progressi" ON user_progress
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 7. DATI DI ESEMPIO
-- =====================================================

-- Inserisci codici corso di esempio (se non esistono)
INSERT INTO anagrafica_codici (codice, nome, description, active) VALUES
('PYTHON101', 'Corso Python Base', 'Introduzione alla programmazione Python per principianti', true),
('JAVASCRIPT', 'JavaScript Moderno', 'ES6+ e sviluppo web moderno', true),
('REACT_BASIC', 'React Fondamentali', 'Componenti, state e props in React', true)
ON CONFLICT (codice) DO NOTHING;

-- Inserisci schede di esempio per PYTHON101
INSERT INTO course_tabs (course_code, tab_name, tab_type, tab_icon, tab_order) VALUES
('PYTHON101', 'Lezioni', 'lessons', 'book-open', 1),
('PYTHON101', 'Esercizi', 'exercises', 'clipboard-list', 2),
('PYTHON101', 'Audio', 'audio', 'headphones', 3),
('PYTHON101', 'Video', 'video', 'play-circle', 4)
ON CONFLICT (course_code, tab_name) DO NOTHING;

-- Inserisci contenuti di esempio per la scheda Lezioni
INSERT INTO course_content (tab_id, title, content_type, content_data, content_order)
SELECT 
    t.id,
    'Introduzione a Python',
    'text',
    jsonb_build_object(
        'paragraphs', jsonb_build_array(
            jsonb_build_object(
                'title', 'Cos''è Python?', 
                'content', 'Python è un linguaggio di programmazione ad alto livello, interpretato e di uso generale. È stato creato da Guido van Rossum e rilasciato per la prima volta nel 1991. Python enfatizza la leggibilità del codice con la sua notevole sintassi.'
            ),
            jsonb_build_object(
                'title', 'Perché imparare Python?', 
                'content', 'Python è uno dei linguaggi più popolari al mondo grazie alla sua semplicità e versatilità. È utilizzato in sviluppo web, data science, intelligenza artificiale, automazione e molto altro.'
            ),
            jsonb_build_object(
                'title', 'Installazione', 
                'content', 'Per iniziare con Python, è necessario installarlo sul proprio sistema. Python può essere scaricato gratuitamente dal sito ufficiale python.org. Molti sistemi operativi hanno Python preinstallato.'
            )
        )
    ),
    1
FROM course_tabs t 
WHERE t.course_code = 'PYTHON101' AND t.tab_type = 'lessons'
ON CONFLICT (tab_id, content_order) DO NOTHING;

-- Secondo contenuto per lezioni
INSERT INTO course_content (tab_id, title, content_type, content_data, content_order)
SELECT 
    t.id,
    'Variabili e Tipi di Dati',
    'text',
    jsonb_build_object(
        'paragraphs', jsonb_build_array(
            jsonb_build_object(
                'title', 'Variabili in Python', 
                'content', 'In Python, le variabili sono contenitori per memorizzare valori di dati. Non è necessario dichiarare il tipo di una variabile quando la si crea. Python determina automaticamente il tipo in base al valore assegnato.'
            ),
            jsonb_build_object(
                'title', 'Tipi di Dati Principali', 
                'content', 'Python ha diversi tipi di dati built-in: stringhe (str), numeri interi (int), numeri decimali (float), booleani (bool), liste (list), tuple (tuple), dizionari (dict) e set (set).'
            )
        )
    ),
    2
FROM course_tabs t 
WHERE t.course_code = 'PYTHON101' AND t.tab_type = 'lessons'
ON CONFLICT (tab_id, content_order) DO NOTHING;

-- Inserisci esercizi di esempio
INSERT INTO course_content (tab_id, title, content_type, content_data, content_order)
SELECT 
    t.id,
    'Esercizio 1: Hello World',
    'exercise',
    jsonb_build_object(
        'question', 'Scrivi un programma Python che stampa "Hello, World!" sullo schermo.',
        'solution', 'print("Hello, World!")',
        'hints', jsonb_build_array(
            'Usa la funzione print() per visualizzare testo',
            'Ricorda di mettere il testo tra virgolette',
            'Le virgolette possono essere singole o doppie'
        )
    ),
    1
FROM course_tabs t 
WHERE t.course_code = 'PYTHON101' AND t.tab_type = 'exercises'
ON CONFLICT (tab_id, content_order) DO NOTHING;

-- Secondo esercizio
INSERT INTO course_content (tab_id, title, content_type, content_data, content_order)
SELECT 
    t.id,
    'Esercizio 2: Variabili e Calcoli',
    'exercise',
    jsonb_build_object(
        'question', 'Crea due variabili numeriche, assegna loro dei valori e stampa la loro somma.',
        'solution', 'a = 10\nb = 5\nrisultato = a + b\nprint("La somma è:", risultato)',
        'hints', jsonb_build_array(
            'Assegna valori alle variabili usando il simbolo =',
            'Puoi sommare le variabili con il simbolo +',
            'Usa print() per mostrare il risultato'
        )
    ),
    2
FROM course_tabs t 
WHERE t.course_code = 'PYTHON101' AND t.tab_type = 'exercises'
ON CONFLICT (tab_id, content_order) DO NOTHING;

-- Inserisci audio di esempio
INSERT INTO course_content (tab_id, title, content_type, content_data, content_order)
SELECT 
    t.id,
    'Pronuncia dei termini Python',
    'audio',
    jsonb_build_object(
        'audio_url', '/audio/python-terms.mp3',
        'duration', 120,
        'transcript', 'In questo audio imparerai la pronuncia corretta dei termini più comuni in Python: variable (variabile), function (funzione), class (classe), object (oggetto), string (stringa), integer (intero).'
    ),
    1
FROM course_tabs t 
WHERE t.course_code = 'PYTHON101' AND t.tab_type = 'audio'
ON CONFLICT (tab_id, content_order) DO NOTHING;

-- Inserisci video di esempio
INSERT INTO course_content (tab_id, title, content_type, content_data, content_order)
SELECT 
    t.id,
    'Video Introduttivo: Il tuo primo programma Python',
    'video',
    jsonb_build_object(
        'video_url', '/video/python-intro.mp4',
        'duration', 300,
        'thumbnail', '/images/python-intro-thumb.jpg',
        'description', 'In questo video vedrai come scrivere e eseguire il tuo primo programma Python step by step.'
    ),
    1
FROM course_tabs t 
WHERE t.course_code = 'PYTHON101' AND t.tab_type = 'video'
ON CONFLICT (tab_id, content_order) DO NOTHING;

-- =====================================================
-- 8. FUNZIONI UTILI
-- =====================================================

-- Funzione per ottenere le schede di un corso con conteggio contenuti
CREATE OR REPLACE FUNCTION get_course_tabs(p_course_code VARCHAR)
RETURNS TABLE(
    id UUID,
    tab_name VARCHAR,
    tab_type VARCHAR,
    tab_icon VARCHAR,
    tab_order INTEGER,
    content_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.tab_name,
        ct.tab_type,
        ct.tab_icon,
        ct.tab_order,
        COUNT(cc.id) as content_count
    FROM course_tabs ct
    LEFT JOIN course_content cc ON ct.id = cc.tab_id AND cc.active = true
    WHERE ct.course_code = p_course_code 
    AND ct.active = true
    GROUP BY ct.id, ct.tab_name, ct.tab_type, ct.tab_icon, ct.tab_order
    ORDER BY ct.tab_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per ottenere statistiche utente
CREATE OR REPLACE FUNCTION get_user_course_stats(p_user_id UUID, p_course_code VARCHAR)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_contents', COUNT(cc.*),
        'completed_contents', COUNT(cc.*) FILTER (WHERE up.progress_status = 'completed'),
        'in_progress_contents', COUNT(cc.*) FILTER (WHERE up.progress_status = 'in_progress'),
        'completion_percentage', 
            CASE 
                WHEN COUNT(cc.*) > 0 THEN 
                    ROUND((COUNT(cc.*) FILTER (WHERE up.progress_status = 'completed')::float / COUNT(cc.*)::float) * 100)
                ELSE 0 
            END
    ) INTO result
    FROM course_tabs ct
    JOIN course_content cc ON ct.id = cc.tab_id
    LEFT JOIN user_progress up ON cc.id = up.content_id AND up.user_id = p_user_id
    WHERE ct.course_code = p_course_code 
    AND ct.active = true 
    AND cc.active = true;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. COMMENTI E DOCUMENTAZIONE
-- =====================================================

COMMENT ON TABLE course_tabs IS 'Definisce le schede/tab disponibili per ogni corso (es: Lezioni, Esercizi, Audio)';
COMMENT ON TABLE course_content IS 'Contenuti specifici di ogni scheda con dati JSON flessibili';
COMMENT ON TABLE user_progress IS 'Traccia il progresso degli utenti nei contenuti del corso';

COMMENT ON COLUMN course_tabs.tab_type IS 'Tipo di contenuto: lessons, exercises, audio, video, quiz, etc.';
COMMENT ON COLUMN course_content.content_data IS 'Dati JSON flessibili per diversi tipi di contenuto';
COMMENT ON COLUMN user_progress.progress_status IS 'Stato del progresso: not_started, in_progress, completed';

-- =====================================================
-- 10. VERIFICA INSTALLAZIONE
-- =====================================================

-- Query di verifica che tutto sia stato creato correttamente
DO $$
DECLARE
    tab_count INTEGER;
    content_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tab_count FROM course_tabs WHERE course_code = 'PYTHON101';
    SELECT COUNT(*) INTO content_count FROM course_content 
    WHERE tab_id IN (SELECT id FROM course_tabs WHERE course_code = 'PYTHON101');
    
    RAISE NOTICE '✅ Setup completato!';
    RAISE NOTICE '📊 Schede create per PYTHON101: %', tab_count;
    RAISE NOTICE '📝 Contenuti totali creati: %', content_count;
    RAISE NOTICE '🚀 Il sistema è pronto per l''uso!';
END $$;

-- =====================================================
-- FINE SCRIPT - TUTTO COMPLETATO! 🎉
-- =====================================================

-- =====================================================
-- SCHEMA AGGIUNTIVO PER SISTEMA ESERCIZI
-- =====================================================

-- 1. TABELLA ANAGRAFICA ESERCIZI
CREATE TABLE IF NOT EXISTS anagrafica_esercizi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    language_code VARCHAR(20) NOT NULL,
    lezione INTEGER NOT NULL,
    text TEXT NOT NULL,
    tipo_esercizio VARCHAR(50) NOT NULL,
    descrizione TEXT,
    frase TEXT,
    opzionali JSONB DEFAULT '{}',
    tipo_validazione VARCHAR(20) DEFAULT 'exact', -- 'exact', 'contains', 'regex'
    soluzione TEXT NOT NULL,
    validazione JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key verso anagrafica_codici
    CONSTRAINT fk_esercizi_codici 
        FOREIGN KEY (language_code) 
        REFERENCES anagrafica_codici(codice) 
        ON DELETE CASCADE
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_anagrafica_esercizi_language ON anagrafica_esercizi(language_code);
CREATE INDEX IF NOT EXISTS idx_anagrafica_esercizi_lezione ON anagrafica_esercizi(lezione);
CREATE INDEX IF NOT EXISTS idx_anagrafica_esercizi_active ON anagrafica_esercizi(active);
CREATE INDEX IF NOT EXISTS idx_anagrafica_esercizi_order ON anagrafica_esercizi(language_code, lezione, created_at);

-- 2. TABELLA PROGRESSO ESERCIZI UTENTE
CREATE TABLE IF NOT EXISTS exercise_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES anagrafica_esercizi(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_seconds INTEGER DEFAULT 0,
    user_answer TEXT, -- Ultima risposta dell'utente
    
    -- Constraint per evitare duplicati
    UNIQUE(user_id, exercise_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_exercise_progress_user ON exercise_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_progress_exercise ON exercise_progress(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_progress_completed ON exercise_progress(completed);
CREATE INDEX IF NOT EXISTS idx_exercise_progress_user_completed ON exercise_progress(user_id, completed);

-- 3. POLICIES DI SICUREZZA (RLS)

-- Abilita RLS sulle nuove tabelle
ALTER TABLE anagrafica_esercizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_progress ENABLE ROW LEVEL SECURITY;

-- Policy per anagrafica_esercizi (lettura pubblica per esercizi attivi con corsi sbloccati)
CREATE POLICY "Lettura esercizi per corsi sbloccati" ON anagrafica_esercizi
    FOR SELECT USING (
        active = true AND
        EXISTS (
            SELECT 1 FROM codici_sbloccati cs 
            WHERE cs.language_code = anagrafica_esercizi.language_code 
            AND cs.user_id = auth.uid()
        )
    );

-- Policy per exercise_progress (solo i propri record)
CREATE POLICY "Utenti vedono solo il proprio progresso" ON exercise_progress
    FOR ALL USING (auth.uid() = user_id);

-- 4. TRIGGER PER AGGIORNAMENTO AUTOMATICO

-- Trigger per aggiornare updated_at su anagrafica_esercizi
CREATE TRIGGER update_anagrafica_esercizi_updated_at
    BEFORE UPDATE ON anagrafica_esercizi
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. FUNZIONI UTILI

-- Funzione per ottenere statistiche progresso utente per corso
CREATE OR REPLACE FUNCTION get_course_progress(p_user_id UUID, p_language_code VARCHAR(20))
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_exercises', COUNT(ae.*),
        'completed_exercises', COUNT(ep.*) FILTER (WHERE ep.completed = true),
        'completion_percentage', ROUND(
            (COUNT(ep.*) FILTER (WHERE ep.completed = true)::DECIMAL / COUNT(ae.*)) * 100, 2
        ),
        'total_lessons', COUNT(DISTINCT ae.lezione),
        'completed_lessons', COUNT(DISTINCT ae.lezione) FILTER (
            WHERE ae.lezione IN (
                SELECT DISTINCT ae2.lezione 
                FROM anagrafica_esercizi ae2 
                LEFT JOIN exercise_progress ep2 ON ae2.id = ep2.exercise_id 
                    AND ep2.user_id = p_user_id
                WHERE ae2.language_code = p_language_code 
                    AND ae2.active = true
                GROUP BY ae2.lezione
                HAVING COUNT(ae2.*) = COUNT(ep2.*) FILTER (WHERE ep2.completed = true)
            )
        ),
        'last_activity', MAX(ep.completed_at),
        'total_time_spent', SUM(ep.time_spent_seconds)
    ) INTO result
    FROM anagrafica_esercizi ae
    LEFT JOIN exercise_progress ep ON ae.id = ep.exercise_id AND ep.user_id = p_user_id
    WHERE ae.language_code = p_language_code AND ae.active = true;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per ottenere prossimo esercizio non completato
CREATE OR REPLACE FUNCTION get_next_exercise(p_user_id UUID, p_language_code VARCHAR(20))
RETURNS TABLE(
    exercise_id UUID,
    lezione INTEGER,
    text TEXT,
    tipo_esercizio VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.id,
        ae.lezione,
        ae.text,
        ae.tipo_esercizio
    FROM anagrafica_esercizi ae
    LEFT JOIN exercise_progress ep ON ae.id = ep.exercise_id AND ep.user_id = p_user_id
    WHERE ae.language_code = p_language_code 
        AND ae.active = true 
        AND (ep.completed IS NULL OR ep.completed = false)
    ORDER BY ae.lezione, ae.created_at
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. DATI DI ESEMPIO PER GLI ESERCIZI

-- Inserisci alcuni esercizi di esempio per PYTHON101
INSERT INTO anagrafica_esercizi (language_code, lezione, text, tipo_esercizio, descrizione, frase, tipo_validazione, soluzione) VALUES
('PYTHON101', 1, 'Stampa "Hello World"', 'coding', 'Scrivi un comando Python per stampare Hello World', '', 'contains', 'print("Hello World")'),
('PYTHON101', 1, 'Crea una variabile', 'coding', 'Crea una variabile chiamata "nome" con il valore "Mario"', '', 'contains', 'nome = "Mario"'),
('PYTHON101', 1, 'Somma due numeri', 'coding', 'Calcola la somma di 5 + 3 e stampala', '', 'contains', 'print(5 + 3)'),
('PYTHON101', 2, 'Ciclo for', 'coding', 'Scrivi un ciclo for che stampi i numeri da 1 a 5', '', 'contains', 'for i in range(1, 6)')