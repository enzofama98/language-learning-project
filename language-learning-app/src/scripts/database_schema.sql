-- =====================================================
-- SCHEMA DATABASE SICURO PER SUPABASE
-- =====================================================

-- 1. TABELLA CODICI CORSI (anagrafica_codici)
-- Sostituisce la vecchia tabella con campi migliorati
CREATE TABLE IF NOT EXISTS anagrafica_codici (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codice VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    max_uses INTEGER, -- Limite opzionale di utilizzi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_anagrafica_codici_active ON anagrafica_codici(active);
CREATE INDEX IF NOT EXISTS idx_anagrafica_codici_codice ON anagrafica_codici(codice);

-- 2. TABELLA CODICI SBLOCCATI (codici_sbloccati)
-- Aggiornata per usare UUID invece di email come chiave
CREATE TABLE IF NOT EXISTS codici_sbloccati (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    utente_mail VARCHAR(255), -- Mantieni per compatibilità, ma deprecato
    language_code VARCHAR(20) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    -- Constraint per evitare duplicati
    UNIQUE(user_id, language_code)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_codici_sbloccati_user ON codici_sbloccati(user_id);
CREATE INDEX IF NOT EXISTS idx_codici_sbloccati_code ON codici_sbloccati(language_code);
CREATE INDEX IF NOT EXISTS idx_codici_sbloccati_accessed ON codici_sbloccati(last_accessed_at);

-- Foreign key verso anagrafica_codici
ALTER TABLE codici_sbloccati 
ADD CONSTRAINT fk_codici_sbloccati_anagrafica 
FOREIGN KEY (language_code) REFERENCES anagrafica_codici(codice) ON DELETE CASCADE;

-- 3. TABELLA LOG ACCESSI (access_logs)
-- Per tracciare tutti gli accessi ai contenuti
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    language_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(255),
    button_id VARCHAR(50),
    action VARCHAR(20) DEFAULT 'access', -- 'access', 'view', 'complete'
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance e analytics
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_course ON access_logs(language_code);
CREATE INDEX IF NOT EXISTS idx_access_logs_date ON access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip ON access_logs(ip_address);

-- 4. RIMOZIONE TABELLA UTENTI INSICURA
-- La vecchia tabella 'utenti' con password in plain text
-- IMPORTANTE: Fai backup prima di eseguire!
-- DROP TABLE IF EXISTS utenti;

-- 5. POLICIES DI SICUREZZA (RLS - Row Level Security)

-- Abilita RLS su tutte le tabelle
ALTER TABLE anagrafica_codici ENABLE ROW LEVEL SECURITY;
ALTER TABLE codici_sbloccati ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Policy per anagrafica_codici (lettura pubblica per codici attivi)
CREATE POLICY "Lettura codici attivi" ON anagrafica_codici
    FOR SELECT USING (active = true);

-- Policy per codici_sbloccati (solo i propri record)
CREATE POLICY "Utenti vedono solo i propri codici" ON codici_sbloccati
    FOR ALL USING (auth.uid() = user_id);

-- Policy per access_logs (solo i propri log)
CREATE POLICY "Utenti vedono solo i propri log" ON access_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Policy per inserimento log (solo per se stessi)
CREATE POLICY "Utenti inseriscono solo i propri log" ON access_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. FUNZIONI UTILI

-- Funzione per ottenere statistiche utente
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_codes', COUNT(cs.*),
        'last_access', MAX(cs.last_accessed_at),
        'total_accesses', SUM(cs.access_count),
        'active_codes', COUNT(cs.*) FILTER (WHERE ac.active = true)
    ) INTO result
    FROM codici_sbloccati cs
    JOIN anagrafica_codici ac ON cs.language_code = ac.codice
    WHERE cs.user_id = user_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per pulire log vecchi (da eseguire periodicamente)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM access_logs 
    WHERE accessed_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGER PER AGGIORNAMENTO AUTOMATICO

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_anagrafica_codici_updated_at
    BEFORE UPDATE ON anagrafica_codici
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. DATI DI ESEMPIO SICURI

-- Inserisci alcuni codici di esempio
INSERT INTO anagrafica_codici (codice, nome, description, active) VALUES
('PYTHON101', 'Corso Python Base', 'Introduzione alla programmazione Python', true),
('JAVASCRIPT', 'JavaScript Moderno', 'ES6+ e sviluppo web moderno', true),
('REACT_BASIC', 'React Fondamentali', 'Componenti, state e props in React', true),
('NODE_API', 'API con Node.js', 'Sviluppo backend con Express e Node.js', true),
('DATABASE', 'Database e SQL', 'PostgreSQL e progettazione database', true),
('ADVANCED_JS', 'JavaScript Avanzato', 'Async/await, closures e patterns avanzati', false)
ON CONFLICT (codice) DO NOTHING;

-- 9. VISTE UTILI PER ANALYTICS

-- Vista per statistiche corsi
CREATE OR REPLACE VIEW course_statistics AS
SELECT 
    ac.codice,
    ac.nome,
    ac.active,
    COUNT(cs.user_id) as total_users,
    COUNT(CASE WHEN cs.last_accessed_at IS NOT NULL THEN 1 END) as active_users,
    MAX(cs.last_accessed_at) as last_access,
    AVG(cs.access_count) as avg_accesses
FROM anagrafica_codici ac
LEFT JOIN codici_sbloccati cs ON ac.codice = cs.language_code
GROUP BY ac.id, ac.codice, ac.nome, ac.active
ORDER BY total_users DESC;

-- Vista per attività utenti
CREATE OR REPLACE VIEW user_activity AS
SELECT 
    u.email,
    COUNT(cs.language_code) as unlocked_courses,
    MAX(cs.last_accessed_at) as last_activity,
    SUM(cs.access_count) as total_accesses,
    COUNT(al.id) as total_logs
FROM auth.users u
LEFT JOIN codici_sbloccati cs ON u.id = cs.user_id
LEFT JOIN access_logs al ON u.id = al.user_id
GROUP BY u.id, u.email
ORDER BY last_activity DESC NULLS LAST;

-- 10. STORED PROCEDURES PER OPERAZIONI COMUNI

-- Procedura per sbloccare un codice per un utente
CREATE OR REPLACE FUNCTION unlock_code_for_user(
    p_user_id UUID,
    p_user_email VARCHAR(255),
    p_code VARCHAR(20)
)
RETURNS JSON AS $
DECLARE
    v_code_exists BOOLEAN;
    v_already_unlocked BOOLEAN;
    result JSON;
BEGIN
    -- Verifica se il codice esiste ed è attivo
    SELECT EXISTS(
        SELECT 1 FROM anagrafica_codici 
        WHERE codice = UPPER(p_code) AND active = true
    ) INTO v_code_exists;
    
    IF NOT v_code_exists THEN
        RETURN json_build_object('success', false, 'error', 'Codice non valido o non attivo');
    END IF;
    
    -- Verifica se già sbloccato
    SELECT EXISTS(
        SELECT 1 FROM codici_sbloccati 
        WHERE user_id = p_user_id AND language_code = UPPER(p_code)
    ) INTO v_already_unlocked;
    
    IF v_already_unlocked THEN
        RETURN json_build_object('success', true, 'message', 'Codice già sbloccato');
    END IF;
    
    -- Sblocca il codice
    INSERT INTO codici_sbloccati (user_id, utente_mail, language_code)
    VALUES (p_user_id, p_user_email, UPPER(p_code));
    
    RETURN json_build_object('success', true, 'message', 'Codice sbloccato con successo');
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedura per ottenere i corsi di un utente
CREATE OR REPLACE FUNCTION get_user_courses(p_user_id UUID)
RETURNS TABLE(
    course_id UUID,
    code VARCHAR(20),
    name VARCHAR(255),
    description TEXT,
    enabled BOOLEAN,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        ac.id,
        ac.codice,
        ac.nome,
        ac.description,
        (cs.user_id IS NOT NULL) as enabled,
        cs.unlocked_at,
        cs.last_accessed_at
    FROM anagrafica_codici ac
    LEFT JOIN codici_sbloccati cs ON ac.codice = cs.language_code AND cs.user_id = p_user_id
    WHERE ac.active = true
    ORDER BY 
        (cs.user_id IS NOT NULL) DESC,  -- Prima i corsi sbloccati
        ac.nome ASC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. BACKUP E MANUTENZIONE

-- Comando per backup (da eseguire manualmente)
-- pg_dump -h your-host -U postgres -d your-database --table=anagrafica_codici --table=codici_sbloccati --table=access_logs > backup.sql

-- 12. MONITORAGGIO E ALERTING

-- Vista per monitorare tentativi di accesso sospetti
CREATE OR REPLACE VIEW suspicious_activity AS
SELECT 
    ip_address,
    COUNT(*) as attempts,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(accessed_at) as first_attempt,
    MAX(accessed_at) as last_attempt
FROM access_logs 
WHERE accessed_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 50  -- Più di 50 richieste in un'ora
OR COUNT(DISTINCT user_id) > 5  -- Più di 5 utenti diversi dallo stesso IP
ORDER BY attempts DESC;

-- 13. PULIZIA E OTTIMIZZAZIONE

-- Funzione per archiviare log vecchi invece di cancellarli
CREATE OR REPLACE FUNCTION archive_old_logs()
RETURNS INTEGER AS $
DECLARE
    archived_count INTEGER;
BEGIN
    -- Crea tabella di archivio se non esiste
    CREATE TABLE IF NOT EXISTS access_logs_archive (LIKE access_logs INCLUDING ALL);
    
    -- Sposta log più vecchi di 90 giorni nell'archivio
    WITH moved_logs AS (
        DELETE FROM access_logs 
        WHERE accessed_at < NOW() - INTERVAL '90 days'
        RETURNING *
    )
    INSERT INTO access_logs_archive SELECT * FROM moved_logs;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. GRANT PERMISSIONS (se necessario)

-- Assicurati che il service role abbia i permessi necessari
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 15. COMMENTI E DOCUMENTAZIONE

COMMENT ON TABLE anagrafica_codici IS 'Catalogo dei corsi disponibili nel sistema';
COMMENT ON TABLE codici_sbloccati IS 'Associazione tra utenti e corsi sbloccati';
COMMENT ON TABLE access_logs IS 'Log di tutti gli accessi ai contenuti per audit e analytics';

COMMENT ON COLUMN anagrafica_codici.codice IS 'Codice univoco del corso (es: PYTHON101)';
COMMENT ON COLUMN anagrafica_codici.max_uses IS 'Limite opzionale di utilizzi del codice';
COMMENT ON COLUMN codici_sbloccati.access_count IS 'Numero di volte che l''utente ha acceduto al corso';
COMMENT ON COLUMN access_logs.action IS 'Tipo di azione: access, view, complete';

-- =====================================================
-- FINE SCHEMA DATABASE
-- =====================================================

-- ISTRUZIONI POST-INSTALLAZIONE:
-- 1. Esegui questo script nel tuo database Supabase
-- 2. Configura le variabili d'ambiente (.env.local):
--    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
--    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
-- 3. Installa le dipendenze necessarie:
--    npm install @supabase/supabase-js @supabase/auth-helpers-nextjs zod
-- 4. Testa la registrazione e il login
-- 5. Monitora i log per eventuali errori