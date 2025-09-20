// FILE: src/hooks/useTranslation.ts (VERSIONE CORRETTA)
// Sostituisci il contenuto del file esistente con questo

import { useState, useEffect, useCallback } from 'react';

export type Language = 'it' | 'fr' | 'de';

interface Translations {
  [key: string]: {
    it: string;
    fr: string;
    de: string;
  };
}

// Traduzioni per tutti i testi statici dell'applicazione
export const translations: Translations = {
  // Header e navigazione
  'home': {
    it: 'Home',
    fr: 'Accueil',
    de: 'Startseite'
  },
  'selectLevel': {
    it: 'Seleziona il tuo livello',
    fr: 'Sélectionnez votre niveau',
    de: 'Wählen Sie Ihr Niveau'
  },
  'selectLesson': {
    it: 'Seleziona una lezione per iniziare',
    fr: 'Sélectionnez une leçon pour commencer',
    de: 'Wählen Sie eine Lektion zum Starten'
  },
  'backToLevels': {
    it: 'Livelli',
    fr: 'Niveaux',
    de: 'Niveaus'
  },

  // Progresso e statistiche
  'totalCourseProgress': {
    it: 'Progresso Totale del Corso',
    fr: 'Progression Totale du Cours',
    de: 'Gesamtfortschritt des Kurses'
  },
  'levelProgress': {
    it: 'Progresso Livello',
    fr: 'Progression du Niveau',
    de: 'Fortschritt Niveau'
  },
  'yourProgress': {
    it: 'I Tuoi Progressi',
    fr: 'Vos Progrès',
    de: 'Ihr Fortschritt'
  },
  'exercisesCompleted': {
    it: 'esercizi completati',
    fr: 'exercices terminés',
    de: 'Übungen abgeschlossen'
  },
  'studyHours': {
    it: 'Ore di Studio',
    fr: 'Heures d\'Étude',
    de: 'Studienstunden'
  },
  'completed': {
    it: 'Completati',
    fr: 'Terminés',
    de: 'Abgeschlossen'
  },
  'currentStreak': {
    it: 'Streak Attuale',
    fr: 'Série Actuelle',
    de: 'Aktuelle Serie'
  },
  'lastActivity': {
    it: 'Ultima Attività',
    fr: 'Dernière Activité',
    de: 'Letzte Aktivität'
  },
  'weeklyActivity': {
    it: 'Attività Settimanale',
    fr: 'Activité Hebdomadaire',
    de: 'Wöchentliche Aktivität'
  },
  'totalMinutes': {
    it: 'min totali',
    fr: 'min totales',
    de: 'min gesamt'
  },
  'today': {
    it: 'Oggi',
    fr: 'Aujourd\'hui',
    de: 'Heute'
  },
  'days': {
    it: 'giorni',
    fr: 'jours',
    de: 'Tage'
  },
  'max': {
    it: 'max',
    fr: 'max',
    de: 'max'
  },

  // Livelli CEFR
  'levelA1Desc': {
    it: 'Livello principiante - Impara le basi fondamentali',
    fr: 'Niveau débutant - Apprenez les bases fondamentales',
    de: 'Anfängerniveau - Lernen Sie die Grundlagen'
  },
  'levelA2Desc': {
    it: 'Livello elementare - Costruisci frasi semplici',
    fr: 'Niveau élémentaire - Construisez des phrases simples',
    de: 'Grundstufe - Bilden Sie einfache Sätze'
  },
  'levelB1Desc': {
    it: 'Livello intermedio - Conversazioni quotidiane',
    fr: 'Niveau intermédiaire - Conversations quotidiennes',
    de: 'Mittelstufe - Alltägliche Gespräche'
  },
  'levelB2Desc': {
    it: 'Livello intermedio avanzato - Argomenti complessi',
    fr: 'Niveau intermédiaire avancé - Sujets complexes',
    de: 'Obere Mittelstufe - Komplexe Themen'
  },
  'levelC1Desc': {
    it: 'Livello avanzato - Padronanza della lingua',
    fr: 'Niveau avancé - Maîtrise de la langue',
    de: 'Fortgeschritten - Sprachbeherrschung'
  },
  'levelC2Desc': {
    it: 'Livello esperto - Competenza nativa',
    fr: 'Niveau expert - Compétence native',
    de: 'Expertenniveau - Muttersprachliche Kompetenz'
  },

  // Lezioni e esercizi
  'lesson': {
    it: 'Lezione',
    fr: 'Leçon',
    de: 'Lektion'
  },
  'lessons': {
    it: 'lezioni',
    fr: 'leçons',
    de: 'Lektionen'
  },
  'exercises': {
    it: 'esercizi',
    fr: 'exercices',
    de: 'Übungen'
  },
  'completedLesson': {
    it: 'Completata',
    fr: 'Terminée',
    de: 'Abgeschlossen'
  },
  'loading': {
    it: 'Caricamento...',
    fr: 'Chargement...',
    de: 'Laden...'
  },
  'loadingLevels': {
    it: 'Caricamento livelli...',
    fr: 'Chargement des niveaux...',
    de: 'Lade Niveaus...'
  },
  'loadingLessons': {
    it: 'Caricamento lezioni...',
    fr: 'Chargement des leçons...',
    de: 'Lade Lektionen...'
  },

  // Errori e messaggi
  'error': {
    it: 'Errore',
    fr: 'Erreur',
    de: 'Fehler'
  },
  'noAccess': {
    it: 'Non hai accesso a questo corso',
    fr: 'Vous n\'avez pas accès à ce cours',
    de: 'Sie haben keinen Zugang zu diesem Kurs'
  },
  'courseLoadError': {
    it: 'Errore durante il caricamento del corso',
    fr: 'Erreur lors du chargement du cours',
    de: 'Fehler beim Laden des Kurses'
  },
  'backToHome': {
    it: 'Torna alla Home',
    fr: 'Retour à l\'Accueil',
    de: 'Zurück zur Startseite'
  },
  'retry': {
    it: 'Riprova',
    fr: 'Réessayer',
    de: 'Wiederholen'
  },

  // Sistema di progressione
  'progressionSystem': {
    it: 'Sistema di progressione',
    fr: 'Système de progression',
    de: 'Fortschrittssystem'
  },
  'progressionDesc1': {
    it: 'Ogni livello contiene esercizi progressivamente più difficili',
    fr: 'Chaque niveau contient des exercices progressivement plus difficiles',
    de: 'Jede Stufe enthält progressiv schwierigere Übungen'
  },
  'progressionDesc2': {
    it: 'Puoi sempre rivedere i livelli completati per ripassare',
    fr: 'Vous pouvez toujours revoir les niveaux terminés pour réviser',
    de: 'Sie können abgeschlossene Stufen jederzeit zur Wiederholung ansehen'
  },
  'progressionDesc3': {
    it: 'I livelli seguono lo standard CEFR (Common European Framework)',
    fr: 'Les niveaux suivent le standard CECR (Cadre Européen Commun de Référence)',
    de: 'Die Stufen folgen dem CEFR-Standard (Gemeinsamer Europäischer Referenzrahmen)'
  },

  // Come funziona
  'howItWorks': {
    it: 'Come funziona',
    fr: 'Comment ça marche',
    de: 'Wie es funktioniert'
  },
  'howItWorksDesc1': {
    it: 'Completa tutti gli esercizi di una lezione per sbloccare la successiva',
    fr: 'Terminez tous les exercices d\'une leçon pour débloquer la suivante',
    de: 'Schließen Sie alle Übungen einer Lektion ab, um die nächste freizuschalten'
  },
  'howItWorksDesc2': {
    it: 'Puoi rivedere le lezioni completate in qualsiasi momento',
    fr: 'Vous pouvez revoir les leçons terminées à tout moment',
    de: 'Sie können abgeschlossene Lektionen jederzeit wiederholen'
  },
  'howItWorksDesc3': {
    it: 'Il tuo progresso viene salvato automaticamente',
    fr: 'Vos progrès sont sauvegardés automatiquement',
    de: 'Ihr Fortschritt wird automatisch gespeichert'
  },

  // Pagina principale
  'yourCourses': {
    it: 'I Tuoi Corsi',
    fr: 'Vos Cours',
    de: 'Ihre Kurse'
  },
  'welcome': {
    it: 'Benvenuto',
    fr: 'Bienvenue',
    de: 'Willkommen'
  },
  'selectCourse': {
    it: 'Seleziona un corso per iniziare.',
    fr: 'Sélectionnez un cours pour commencer.',
    de: 'Wählen Sie einen Kurs zum Starten.'
  },
  'ourBooks': {
    it: 'I nostri libri',
    fr: 'Nos livres',
    de: 'Unsere Bücher'
  },
  'available': {
    it: 'Disponibili',
    fr: 'Disponibles',
    de: 'Verfügbar'
  },
  'blocked': {
    it: 'Bloccati',
    fr: 'Bloqués',
    de: 'Gesperrt'
  },
  'total': {
    it: 'Totali',
    fr: 'Total',
    de: 'Gesamt'
  },
  'availableCourses': {
    it: 'Corsi Disponibili',
    fr: 'Cours Disponibles',
    de: 'Verfügbare Kurse'
  },
  'noCourses': {
    it: 'Nessun corso disponibile.',
    fr: 'Aucun cours disponible.',
    de: 'Keine Kurse verfügbar.'
  },
  'progress': {
    it: 'Progresso',
    fr: 'Progrès',
    de: 'Fortschritt'
  },
  'courseCompleted': {
    it: 'Corso completato!',
    fr: 'Cours terminé !',
    de: 'Kurs abgeschlossen!'
  },
  'lastAccess': {
    it: 'Ultimo accesso',
    fr: 'Dernier accès',
    de: 'Letzter Zugang'
  },

  // Giorni della settimana (abbreviati)
  'dayMon': {
    it: 'Lun',
    fr: 'Lun',
    de: 'Mo'
  },
  'dayTue': {
    it: 'Mar',
    fr: 'Mar',
    de: 'Di'
  },
  'dayWed': {
    it: 'Mer',
    fr: 'Mer',
    de: 'Mi'
  },
  'dayThu': {
    it: 'Gio',
    fr: 'Jeu',
    de: 'Do'
  },
  'dayFri': {
    it: 'Ven',
    fr: 'Ven',
    de: 'Fr'
  },
  'daySat': {
    it: 'Sab',
    fr: 'Sam',
    de: 'Sa'
  },
  'daySun': {
    it: 'Dom',
    fr: 'Dim',
    de: 'So'
  },

  // Statistiche
  'sessions': {
    it: 'Sessioni',
    fr: 'Sessions',
    de: 'Sitzungen'
  },
  'activeDays': {
    it: 'Giorni Attivi',
    fr: 'Jours Actifs',
    de: 'Aktive Tage'
  },
  'minutesPerDay': {
    it: 'min/giorno',
    fr: 'min/jour',
    de: 'min/Tag'
  },

  // Messaggi di blocco/completamento
  'unlockPrevious': {
    it: 'Completa almeno l\'80% del livello precedente per sbloccare questo livello!',
    fr: 'Terminez au moins 80% du niveau précédent pour débloquer ce niveau !',
    de: 'Schließen Sie mindestens 80% der vorherigen Stufe ab, um diese Stufe freizuschalten!'
  },
  'unlockPreviousLesson': {
    it: 'Completa prima la lezione precedente per sbloccare questa lezione!',
    fr: 'Terminez d\'abord la leçon précédente pour débloquer cette leçon !',
    de: 'Schließen Sie zuerst die vorherige Lektion ab, um diese Lektion freizuschalten!'
  },

  // Traduzioni per la pagina degli esercizi
  'lessonCompleted': {
    it: 'Lezione Completata',
    fr: 'Leçon Terminée',
    de: 'Lektion Abgeschlossen'
  },
  'completedAllExercises': {
    it: 'Hai completato tutti gli esercizi della lezione',
    fr: 'Vous avez terminé tous les exercices de la leçon',
    de: 'Sie haben alle Übungen der Lektion abgeschlossen'
  },
  'backToLessons': {
    it: 'Torna alle Lezioni',
    fr: 'Retour aux Leçons',
    de: 'Zurück zu den Lektionen'
  },
  'level': {
    it: 'Livello',
    fr: 'Niveau',
    de: 'Niveau'
  },
  'exercise': {
    it: 'Esercizio',
    fr: 'Exercice',
    de: 'Übung'
  },
  'of': {
    it: 'di',
    fr: 'de',
    de: 'von'
  },
  'exit': {
    it: 'Esci',
    fr: 'Quitter',
    de: 'Beenden'
  },
  'resumedFromWhere': {
    it: 'Ripresa dal punto in cui avevi lasciato',
    fr: 'Reprise là où vous vous étiez arrêté',
    de: 'Fortgesetzt von dem Punkt, an dem Sie aufgehört haben'
  },
  'loadingCourse': {
    it: 'Caricamento corso...',
    fr: 'Chargement du cours...',
    de: 'Lade Kurs...'
  },
  'exerciseTypeNotSupported': {
    it: 'Tipo di esercizio non supportato',
    fr: 'Type d\'exercice non supporté',
    de: 'Übungstyp nicht unterstützt'
  },
  'sentenceToTranslate': {
    it: 'Frase da tradurre',
    fr: 'Phrase à traduire',
    de: 'Zu übersetzender Satz'
  },
  'dragWordsToTranslate': {
    it: 'Trascina le parole per formare la traduzione',
    fr: 'Faites glisser les mots pour former la traduction',
    de: 'Ziehen Sie die Wörter, um die Übersetzung zu bilden'
  },
  'translation': {
    it: 'Traduzione',
    fr: 'Traduction',
    de: 'Übersetzung'
  },
  'completeSentence': {
    it: 'Completa la frase',
    fr: 'Complétez la phrase',
    de: 'Vervollständigen Sie den Satz'
  },
  'selectCorrectWord': {
    it: 'Seleziona la parola corretta',
    fr: 'Sélectionnez le mot correct',
    de: 'Wählen Sie das richtige Wort'
  },
  'listenAndFormSentence': {
    it: 'Ascolta l\'audio e forma la frase',
    fr: 'Écoutez l\'audio et formez la phrase',
    de: 'Hören Sie das Audio und bilden Sie den Satz'
  },
  'clickToListen': {
    it: 'Clicca per ascoltare',
    fr: 'Cliquez pour écouter',
    de: 'Klicken zum Anhören'
  },
  'selectWordsInOrder': {
    it: 'Seleziona le parole nell\'ordine corretto',
    fr: 'Sélectionnez les mots dans le bon ordre',
    de: 'Wählen Sie die Wörter in der richtigen Reihenfolge'
  },
  'formedSentence': {
    it: 'Frase formata',
    fr: 'Phrase formée',
    de: 'Gebildeter Satz'
  },
  'matchWordsTranslation': {
    it: 'Abbina ogni parola alla sua traduzione',
    fr: 'Associez chaque mot à sa traduction',
    de: 'Ordnen Sie jedes Wort seiner Übersetzung zu'
  },
  'clickTwoWords': {
    it: 'Clicca due parole per formare una coppia. Ogni coppia avrà un colore diverso.',
    fr: 'Cliquez sur deux mots pour former une paire. Chaque paire aura une couleur différente.',
    de: 'Klicken Sie auf zwei Wörter, um ein Paar zu bilden. Jedes Paar hat eine andere Farbe.'
  },
  'selectPairsWithColors': {
    it: 'Seleziona le coppie - ogni coppia avrà un colore diverso',
    fr: 'Sélectionnez les paires - chaque paire aura une couleur différente',
    de: 'Wählen Sie die Paare - jedes Paar hat eine andere Farbe'
  },
  'selectedPairs': {
    it: 'Coppie selezionate',
    fr: 'Paires sélectionnées',
    de: 'Ausgewählte Paare'
  },
  'selectedWord': {
    it: 'Hai selezionato',
    fr: 'Vous avez sélectionné',
    de: 'Sie haben ausgewählt'
  },
  'clickAnotherWord': {
    it: 'Clicca su un\'altra parola per completare la coppia.',
    fr: 'Cliquez sur un autre mot pour compléter la paire.',
    de: 'Klicken Sie auf ein anderes Wort, um das Paar zu vervollständigen.'
  },
  'previous': {
    it: 'Precedente',
    fr: 'Précédent',
    de: 'Vorherige'
  },
  'verify': {
    it: 'Verifica',
    fr: 'Vérifier',
    de: 'Überprüfen'
  },
  'attemptsLeft': {
    it: 'tentativi rimasti',
    fr: 'tentatives restantes',
    de: 'Versuche übrig'
  },
  'completeLesson': {
    it: 'Completa Lezione',
    fr: 'Terminer la Leçon',
    de: 'Lektion Abschließen'
  },
  'next': {
    it: 'Avanti',
    fr: 'Suivant',
    de: 'Weiter'
  },
  'correct': {
    it: 'Corretto!',
    fr: 'Correct !',
    de: 'Richtig!'
  },
  'incorrect': {
    it: 'Non corretto',
    fr: 'Incorrect',
    de: 'Nicht korrekt'
  },
  'attempt': {
    it: 'Tentativo',
    fr: 'Tentative',
    de: 'Versuch'
  },
  'attemptsExhausted': {
    it: 'Hai esaurito i tentativi disponibili',
    fr: 'Vous avez épuisé les tentatives disponibles',
    de: 'Sie haben die verfügbaren Versuche aufgebraucht'
  },
  'solution': {
    it: 'Soluzione',
    fr: 'Solution',
    de: 'Lösung'
  },
  'alreadyAttempted': {
    it: 'Hai già fatto',
    fr: 'Vous avez déjà fait',
    de: 'Sie haben bereits gemacht'
  },
  'attempts': {
    it: 'tentativi',
    fr: 'tentatives',
    de: 'Versuche'
  },
  'remaining': {
    it: 'Te ne rimangono',
    fr: 'Il vous en reste',
    de: 'Sie haben noch'
  },
  'exhaustedAttempts': {
    it: 'Hai esaurito i 3 tentativi disponibili per questo esercizio.',
    fr: 'Vous avez épuisé les 3 tentatives disponibles pour cet exercice.',
    de: 'Sie haben die 3 verfügbaren Versuche für diese Übung aufgebraucht.'
  },
  'exerciseAlreadyCompleted': {
    it: 'Esercizio già completato in precedenza',
    fr: 'Exercice déjà terminé précédemment',
    de: 'Übung bereits zuvor abgeschlossen'
  },
  'progressLesson': {
    it: 'Progresso Lezione',
    fr: 'Progression de la Leçon',
    de: 'Fortschritt der Lektion'
  },
  'navigationTips': {
    it: 'Suggerimenti per la Navigazione',
    fr: 'Conseils de Navigation',
    de: 'Navigationstipps'
  },
  'checkAnswerTip': {
    it: 'Controlla la tua risposta prima di procedere',
    fr: 'Vérifiez votre réponse avant de continuer',
    de: 'Überprüfen Sie Ihre Antwort, bevor Sie fortfahren'
  },
  'retryTip': {
    it: 'Se sbagli, puoi riprovare l\'esercizio immediatamente',
    fr: 'Si vous vous trompez, vous pouvez réessayer l\'exercice immédiatement',
    de: 'Wenn Sie einen Fehler machen, können Sie die Übung sofort wiederholen'
  },
  'nextTip': {
    it: 'Passa al prossimo esercizio quando hai completato quello corrente',
    fr: 'Passez au prochain exercice une fois que vous avez terminé celui en cours',
    de: 'Gehen Sie zur nächsten Übung, wenn Sie die aktuelle abgeschlossen haben'
  },
  'skipTip': {
    it: 'Puoi saltare direttamente agli esercizi successivi',
    fr: 'Vous pouvez passer directement aux exercices suivants',
    de: 'Sie können direkt zu den nächsten Übungen springen'
  },

  // Traduzioni per login e autenticazione
  'loginToAccount': {
    it: 'Accedi al tuo account',
    fr: 'Connectez-vous à votre compte',
    de: 'Melden Sie sich bei Ihrem Konto an'
  },
  'enterCredentials': {
    it: 'Inserisci le tue credenziali per continuare',
    fr: 'Entrez vos identifiants pour continuer',
    de: 'Geben Sie Ihre Anmeldedaten ein, um fortzufahren'
  },
  'email': {
    it: 'Email',
    fr: 'Email',
    de: 'E-Mail'
  },
  'password': {
    it: 'Password',
    fr: 'Mot de passe',
    de: 'Passwort'
  },
  'emailPlaceholder': {
    it: 'tua@email.com',
    fr: 'votre@email.com',
    de: 'ihre@email.com'
  },
  'passwordPlaceholder': {
    it: 'La tua password',
    fr: 'Votre mot de passe',
    de: 'Ihr Passwort'
  },
  'login': {
    it: 'Accedi',
    fr: 'Se connecter',
    de: 'Anmelden'
  },
  'loggingIn': {
    it: 'Accesso in corso...',
    fr: 'Connexion en cours...',
    de: 'Anmeldung läuft...'
  },
  'noAccount': {
    it: 'Non hai un account?',
    fr: 'Vous n\'avez pas de compte ?',
    de: 'Haben Sie kein Konto?'
  },
  'signUpHere': {
    it: 'Registrati qui',
    fr: 'Inscrivez-vous ici',
    de: 'Hier registrieren'
  },
  'emailPasswordRequired': {
    it: 'Email e password sono obbligatori',
    fr: 'L\'email et le mot de passe sont obligatoires',
    de: 'E-Mail und Passwort sind erforderlich'
  },
  'invalidEmail': {
    it: 'Email non valida',
    fr: 'Email invalide',
    de: 'Ungültige E-Mail'
  },
  'passwordMinLength': {
    it: 'La password deve essere di almeno 6 caratteri',
    fr: 'Le mot de passe doit contenir au moins 6 caractères',
    de: 'Das Passwort muss mindestens 6 Zeichen lang sein'
  },
  'invalidCredentials': {
    it: 'Credenziali non valide',
    fr: 'Identifiants invalides',
    de: 'Ungültige Anmeldedaten'
  },
  'tooManyRequests': {
    it: 'Troppi tentativi. Riprova tra qualche minuto.',
    fr: 'Trop de tentatives. Réessayez dans quelques minutes.',
    de: 'Zu viele Versuche. Versuchen Sie es in ein paar Minuten erneut.'
  },
  'loginError': {
    it: 'Errore durante il login',
    fr: 'Erreur lors de la connexion',
    de: 'Fehler bei der Anmeldung'
  },
  'unexpectedLoginError': {
    it: 'Errore imprevisto durante il login',
    fr: 'Erreur inattendue lors de la connexion',
    de: 'Unerwarteter Fehler bei der Anmeldung'
  },

  // Traduzioni per registrazione
  'createAccount': {
    it: 'Crea il tuo account',
    fr: 'Créez votre compte',
    de: 'Erstellen Sie Ihr Konto'
  },
  'enterDataToRegister': {
    it: 'Inserisci i tuoi dati per registrarti',
    fr: 'Entrez vos données pour vous inscrire',
    de: 'Geben Sie Ihre Daten zur Registrierung ein'
  },
  'confirmPassword': {
    it: 'Conferma Password',
    fr: 'Confirmer le mot de passe',
    de: 'Passwort bestätigen'
  },
  'accessCode': {
    it: 'Codice di Accesso',
    fr: 'Code d\'accès',
    de: 'Zugangscode'
  },
  'passwordMinLength8': {
    it: 'Almeno 8 caratteri, con maiuscole, minuscole e numeri',
    fr: 'Au moins 8 caractères, avec majuscules, minuscules et chiffres',
    de: 'Mindestens 8 Zeichen, mit Groß-, Kleinbuchstaben und Zahlen'
  },
  'repeatPassword': {
    it: 'Ripeti la password',
    fr: 'Répétez le mot de passe',
    de: 'Passwort wiederholen'
  },
  'enterProvidedCode': {
    it: 'Inserisci il codice fornito',
    fr: 'Entrez le code fourni',
    de: 'Geben Sie den bereitgestellten Code ein'
  },
  'register': {
    it: 'Registrati',
    fr: 'S\'inscrire',
    de: 'Registrieren'
  },
  'registering': {
    it: 'Registrazione in corso...',
    fr: 'Inscription en cours...',
    de: 'Registrierung läuft...'
  },
  'alreadyHaveAccount': {
    it: 'Hai già un account?',
    fr: 'Vous avez déjà un compte ?',
    de: 'Haben Sie bereits ein Konto?'
  },
  'loginHere': {
    it: 'Accedi qui',
    fr: 'Connectez-vous ici',
    de: 'Hier anmelden'
  },
  'allFieldsRequired': {
    it: 'Tutti i campi sono obbligatori',
    fr: 'Tous les champs sont obligatoires',
    de: 'Alle Felder sind erforderlich'
  },
  'password8Characters': {
    it: 'La password deve essere di almeno 8 caratteri',
    fr: 'Le mot de passe doit contenir au moins 8 caractères',
    de: 'Das Passwort muss mindestens 8 Zeichen lang sein'
  },
  'passwordComplexity': {
    it: 'La password deve contenere almeno una lettera minuscola, una maiuscola e un numero',
    fr: 'Le mot de passe doit contenir au moins une lettre minuscule, une majuscule et un chiffre',
    de: 'Das Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben und eine Zahl enthalten'
  },
  'passwordsDontMatch': {
    it: 'Le password non coincidono',
    fr: 'Les mots de passe ne correspondent pas',
    de: 'Die Passwörter stimmen nicht überein'
  },
  'invalidAccessCode': {
    it: 'Il codice di accesso non è valido',
    fr: 'Le code d\'accès n\'est pas valide',
    de: 'Der Zugangscode ist nicht gültig'
  },
  'invalidCode': {
    it: 'Codice non valido',
    fr: 'Code invalide',
    de: 'Ungültiger Code'
  },
  'emailAlreadyRegistered': {
    it: 'Questa email è già registrata',
    fr: 'Cet email est déjà enregistré',
    de: 'Diese E-Mail ist bereits registriert'
  },
  'registrationDisabled': {
    it: 'La registrazione è temporaneamente disabilitata',
    fr: 'L\'inscription est temporairement désactivée',
    de: 'Die Registrierung ist vorübergehend deaktiviert'
  },
  'registrationError': {
    it: 'Errore durante la registrazione',
    fr: 'Erreur lors de l\'inscription',
    de: 'Fehler bei der Registrierung'
  },
  'registrationCompleted': {
    it: 'Registrazione completata! Verrai reindirizzato al login.',
    fr: 'Inscription terminée ! Vous serez redirigé vers la connexion.',
    de: 'Registrierung abgeschlossen! Sie werden zur Anmeldung weitergeleitet.'
  },
  'unexpectedRegistrationError': {
    it: 'Errore imprevisto durante la registrazione',
    fr: 'Erreur inattendue lors de l\'inscription',
    de: 'Unerwarteter Fehler bei der Registrierung'
  }
};

// Stato globale per la lingua corrente
let currentLanguage: Language = 'it';
const subscribers = new Set<() => void>();

// Funzione per notificare tutti i componenti del cambio lingua
const notifySubscribers = () => {
  subscribers.forEach(callback => callback());
};

// Funzione per cambiare lingua globalmente
const setGlobalLanguage = (newLanguage: Language) => {
  currentLanguage = newLanguage;
  // Salva nel localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred-language', newLanguage);
  }
  // Notifica tutti i componenti
  notifySubscribers();
};

// Funzione per ottenere la lingua salvata
const getSavedLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('preferred-language') as Language;
    if (saved && ['it', 'fr', 'de'].includes(saved)) {
      return saved;
    }
  }
  return 'it';
};

// Inizializza la lingua al caricamento
if (typeof window !== 'undefined') {
  currentLanguage = getSavedLanguage();
}

export const useTranslation = () => {
  const [, forceUpdate] = useState({});
  
  // Forza il re-render quando cambia la lingua
  const triggerRerender = useCallback(() => {
    forceUpdate({});
  }, []);

  useEffect(() => {
    // Iscrive questo componente agli aggiornamenti
    subscribers.add(triggerRerender);
    
    // Pulizia quando il componente viene smontato
    return () => {
      subscribers.delete(triggerRerender);
    };
  }, [triggerRerender]);

  // Inizializza la lingua dal localStorage solo una volta
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = getSavedLanguage();
      if (savedLanguage !== currentLanguage) {
        currentLanguage = savedLanguage;
        triggerRerender();
      }
    }
  }, [triggerRerender]);

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation key "${key}" not found`);
      return key;
    }
    return translation[currentLanguage] || translation.it || key;
  }, []);

  const changeLanguage = useCallback((newLanguage: Language) => {
    setGlobalLanguage(newLanguage);
  }, []);

  return {
    language: currentLanguage,
    t,
    changeLanguage
  };
};