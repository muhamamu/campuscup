const MATCH_PERIODS = {
    FIRST_HALF: 'FIRST_HALF',
    SECOND_HALF: 'SECOND_HALF',
    FIRST_EXTRA_HALF: 'FIRST_EXTRA_HALF',
    SECOND_EXTRA_HALF: 'SECOND_EXTRA_HALF',
    PENALTIES: 'PENALTIES',
    FULL_TIME: 'FULL_TIME'
};

const EVENT_TYPES = {
    GOAL: 'goal',
    PENALTY_GOAL: 'penalty-goal',
    PENALTY_MISS: 'penalty-miss',
    YELLOW_CARD: 'yellow-card',
    RED_CARD: 'red-card',
    SUBSTITUTION: 'substitution',
    OFFSIDE: 'offside',
    FOUL: 'foul',
    SAVE: 'save',
    CORNER: 'corner',
    OFF_TARGET: 'off-target'
};

const GOAL_TYPES = {
    REGULAR: 'Regular',
    PENALTY: 'Penalty',
    FREE_KICK: 'Free Kick',
    OWN_GOAL: 'Own Goal',
    HEADER: 'Header'
};

class GameManager {
    constructor() {
        this.teams = [];
        this.standings = [];
        this.match = null;
        this.scheduledMatches = [];
        this.matchHistory = [];
        this.subscribers = [];
        this.sb = null;
        this.stopwatchInterval = null;
        this.stopwatchElapsed = 0;
        this.stopwatchRunning = false;
        this.init();
    }

    async init() {
        try {
            this.sb = await getSupabase();
            if (this.sb) {
                await this.loadFromSupabase();
            } else {
                this.loadFallbackData();
            }
        } catch (error) {
            console.error('Error initializing Supabase:', error);
            this.loadFallbackData();
        }
    }

    getDefaultStandings() {
        return this.teams.map((team, index) => ({
            team,
            pos: index + 1,
            mp: 0, w: 0, d: 0, l: 0,
            gf: 0, ga: 0, gd: 0, pts: 0,
            form: []
        }));
    }

    loadFallbackData() {
        let localStorageTeams = null;
        let localStorageStandings = null;
        let localStorageMatch = null;
        let localStorageScheduled = null;
        let localStorageHistory = null;

        try {
            localStorageTeams = localStorage.getItem('teams');
            localStorageStandings = localStorage.getItem('standings');
            localStorageMatch = localStorage.getItem('liveMatch');
            localStorageScheduled = localStorage.getItem('scheduledMatches');
            localStorageHistory = localStorage.getItem('matchHistory');
        } catch (e) {
            console.warn('Storage access blocked:', e);
        }

        if (localStorageTeams) {
            try {
                this.teams = JSON.parse(localStorageTeams);
            } catch (e) {
                this.teams = [];
            }
        }

        let parsedStandings = null;
        if (localStorageStandings) {
            try {
                parsedStandings = JSON.parse(localStorageStandings);
            } catch (e) {
                parsedStandings = null;
            }
        }

        if (parsedStandings && Array.isArray(parsedStandings)) {
            this.standings = parsedStandings;
        } else {
            this.standings = this.getDefaultStandings();
        }

        if (localStorageMatch) {
            try {
                this.match = JSON.parse(localStorageMatch);
            } catch (e) {
                this.match = this.createDefaultMatch();
            }
        } else {
            this.match = this.createDefaultMatch();
        }

        if (localStorageScheduled) {
            try {
                this.scheduledMatches = JSON.parse(localStorageScheduled);
            } catch (e) {
                this.scheduledMatches = [];
            }
        } else {
            this.scheduledMatches = [];
        }

        if (localStorageHistory) {
            try {
                this.matchHistory = JSON.parse(localStorageHistory);
            } catch (e) {
                this.matchHistory = [];
            }
        } else {
            this.matchHistory = [];
        }

        this.notifySubscribers();
        this.resumeStopwatchIfNeeded();
    }

    resumeStopwatchIfNeeded() {
        if (this.match && this.match.isLive && this.match.period !== MATCH_PERIODS.PENALTIES) {
            // First, update stopwatch immediately using stored start time
            if (this.match.stopwatchStartTime) {
                this.match.stopwatch = Date.now() - this.match.stopwatchStartTime;
                this.updateMatchMinuteFromStopwatch();
                this.notifySubscribers();
            } else {
                this.match.stopwatchStartTime = Date.now() - this.match.stopwatch;
            }
            // Then start interval if not already running
            if (!this.stopwatchRunning) {
                this.stopwatchRunning = true;
                this.stopwatchInterval = setInterval(() => {
                    if (this.match && this.match.isLive && this.match.period !== MATCH_PERIODS.PENALTIES) {
                        if (!this.match.stopwatchStartTime) {
                            this.match.stopwatchStartTime = Date.now() - this.match.stopwatch;
                        }
                        this.match.stopwatch = Date.now() - this.match.stopwatchStartTime;
                        this.updateMatchMinuteFromStopwatch();
                        this.saveData();
                        this.notifySubscribers();
                    } else {
                        this.pauseStopwatch();
                    }
                }, 100);
            }
        }
    }

    createDefaultMatch() {
        const home = this.teams.length > 0 ? this.teams[0] : { name: 'Home', logoBg: '#ccc', logoText: 'H' };
        const away = this.teams.length > 1 ? this.teams[1] : { name: 'Away', logoBg: '#ddd', logoText: 'A' };
        return {
            homeTeam: home,
            awayTeam: away,
            homeScore: 0,
            awayScore: 0,
            homePenalties: 0,
            awayPenalties: 0,
            homePenaltyAttempts: [],
            awayPenaltyAttempts: [],
            minute: "0'",
            period: MATCH_PERIODS.FIRST_HALF,
            isLive: false,
            status: 'SCHEDULED',
            stopwatch: 0,
            stopwatchStartTime: null,
            stats: {
                homePossession: 50,
                awayPossession: 50,
                homeShots: 0,
                awayShots: 0,
                homeShotsOnTarget: 0,
                awayShotsOnTarget: 0,
                homeFouls: 0,
                awayFouls: 0,
                homeSaves: 0,
                awaySaves: 0,
                homeCorners: 0,
                awayCorners: 0
            },
            events: []
        };
    }

    async loadFromSupabase() {
        try {
            // Load Teams
            const { data: teamsData } = await this.sb
                .from('teams')
                .select('*')
                .order('name');
            
            if (teamsData) {
                this.teams = teamsData.map(t => ({
                    id: t.id,
                    name: t.name,
                    shortCode: t.short_code,
                    logoBg: t.logo_bg,
                    logoText: t.logo_text,
                    logoUrl: t.logo_url
                }));
            }

            // Load Standings
            const { data: standingsData } = await this.sb
                .from('standings')
                .select('*')
                .order('pts', { ascending: false })
                .order('gd', { ascending: false })
                .order('gf', { ascending: false });

            if (standingsData && standingsData.length > 0) {
                this.standings = standingsData.map(row => ({
                    pos: row.pos,
                    team: {
                        id: row.team_id,
                        name: row.team_name,
                        shortCode: row.team_short_code,
                        logoBg: row.team_logo_bg,
                        logoText: row.team_logo_text,
                        logoUrl: row.team_logo_url
                    },
                    mp: row.mp,
                    w: row.w,
                    d: row.d,
                    l: row.l,
                    gf: row.gf,
                    ga: row.ga,
                    gd: row.gd,
                    pts: row.pts,
                    form: row.form || []
                }));
            } else {
                this.standings = this.getDefaultStandings();
            }

            // Load Live Match
            const { data: matchRows, error: matchError } = await this.sb
                .from('live_match')
                .select('*')
                .eq('id', 'current')
                .limit(1);

            if (matchError) {
                console.warn('Error fetching live match:', matchError);
            }

            const matchData = matchRows && matchRows.length > 0 ? matchRows[0] : null;

            if (matchData) {
                this.match = {
                    homeTeam: {
                        id: matchData.home_team_id,
                        name: matchData.home_team_name,
                        shortCode: matchData.home_team_short_code,
                        logoBg: matchData.home_team_logo_bg,
                        logoText: matchData.home_team_logo_text,
                        logoUrl: matchData.home_team_logo_url
                    },
                    awayTeam: {
                        id: matchData.away_team_id,
                        name: matchData.away_team_name,
                        shortCode: matchData.away_team_short_code,
                        logoBg: matchData.away_team_logo_bg,
                        logoText: matchData.away_team_logo_text,
                        logoUrl: matchData.away_team_logo_url
                    },
                    homeScore: matchData.home_score,
                    awayScore: matchData.away_score,
                    homePenalties: matchData.home_penalties,
                    awayPenalties: matchData.away_penalties,
                    homePenaltyAttempts: matchData.home_penalty_attempts || [],
                    awayPenaltyAttempts: matchData.away_penalty_attempts || [],
                    minute: matchData.minute,
                    period: matchData.period,
                    isLive: matchData.is_live,
                    status: matchData.status,
                    stopwatch: matchData.stopwatch || 0,
                    stopwatchStartTime: matchData.stopwatch_start_time || null,
                    stats: matchData.stats || {},
                    events: matchData.events || []
                };
            } else {
                this.match = this.createDefaultMatch();
            }

            // Load Match History
            const { data: historyData } = await this.sb
                .from('match_history')
                .select('*')
                .order('created_at', { ascending: false });

            if (historyData) {
                this.matchHistory = historyData.map(histMatch => ({
                    id: histMatch.id,
                    homeTeam: {
                        id: histMatch.home_team_id,
                        name: histMatch.home_team_name,
                        shortCode: histMatch.home_team_short_code,
                        logoBg: histMatch.home_team_logo_bg,
                        logoText: histMatch.home_team_logo_text,
                        logoUrl: histMatch.home_team_logo_url
                    },
                    awayTeam: {
                        id: histMatch.away_team_id,
                        name: histMatch.away_team_name,
                        shortCode: histMatch.away_team_short_code,
                        logoBg: histMatch.away_team_logo_bg,
                        logoText: histMatch.away_team_logo_text,
                        logoUrl: histMatch.away_team_logo_url
                    },
                    homeScore: histMatch.home_score,
                    awayScore: histMatch.away_score,
                    homePenalties: histMatch.home_penalties,
                    awayPenalties: histMatch.away_penalties,
                    status: histMatch.status,
                    events: histMatch.events || [],
                    createdAt: histMatch.created_at
                }));
            }

            // Load Scheduled Matches
            const { data: scheduledData } = await this.sb
                .from('scheduled_matches')
                .select('*')
                .order('match_date', { ascending: true });

            if (scheduledData) {
                this.scheduledMatches = scheduledData.map(sm => ({
                    id: sm.id,
                    homeTeam: {
                        id: sm.home_team_id,
                        name: sm.home_team_name,
                        shortCode: sm.home_team_short_code,
                        logoBg: sm.home_team_logo_bg,
                        logoText: sm.home_team_logo_text,
                        logoUrl: sm.home_team_logo_url
                    },
                    awayTeam: {
                        id: sm.away_team_id,
                        name: sm.away_team_name,
                        shortCode: sm.away_team_short_code,
                        logoBg: sm.away_team_logo_bg,
                        logoText: sm.away_team_logo_text,
                        logoUrl: sm.away_team_logo_url
                    },
                    matchDate: sm.match_date,
                    status: sm.status,
                    createdAt: sm.created_at
                }));
            }

            this.notifySubscribers();
            this.resumeStopwatchIfNeeded();
        } catch (error) {
            console.error('Error loading from Supabase:', error);
            this.loadFallbackData();
        }
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        if (this.standings.length > 0 && this.match) {
            callback(this.standings, this.match, this.matchHistory, this.scheduledMatches);
        }
    }

    notifySubscribers() {
        console.log('notifySubscribers called! this.standings:', this.standings);
        this.subscribers.forEach(callback => callback(this.standings, this.match, this.matchHistory, this.scheduledMatches));
    }

    async saveToSupabase() {
        if (!this.sb) return;

        try {
            // Save Teams
            for (const team of this.teams) {
                try {
                    await this.sb
                        .from('teams')
                        .upsert({
                            id: team.id,
                            name: team.name,
                            short_code: team.shortCode,
                            logo_bg: team.logoBg,
                            logo_text: team.logoText,
                            logo_url: team.logoUrl,
                            updated_at: new Date().toISOString()
                        });
                } catch (teamErr) {
                    console.error('Error saving team:', team.name, teamErr);
                }
            }

            // Save Standings
            for (const standing of this.standings) {
                try {
                    await this.sb
                        .from('standings')
                        .upsert({
                            team_id: standing.team.id,
                            team_name: standing.team.name,
                            team_short_code: standing.team.shortCode,
                            team_logo_bg: standing.team.logoBg,
                            team_logo_text: standing.team.logoText,
                            team_logo_url: standing.team.logoUrl,
                            pos: standing.pos,
                            mp: standing.mp,
                            w: standing.w,
                            d: standing.d,
                            l: standing.l,
                            gf: standing.gf,
                            ga: standing.ga,
                            gd: standing.gd,
                            pts: standing.pts,
                            form: standing.form,
                            updated_at: new Date().toISOString()
                        });
                } catch (standErr) {
                    console.error('Error saving standing:', standing.team.name, standErr);
                }
            }

            // Save Live Match
            if (this.match) {
                try {
                    await this.sb
                        .from('live_match')
                        .upsert({
                            id: 'current',
                            home_team_id: this.match.homeTeam.id,
                            home_team_name: this.match.homeTeam.name,
                            home_team_short_code: this.match.homeTeam.shortCode,
                            home_team_logo_bg: this.match.homeTeam.logoBg,
                            home_team_logo_text: this.match.homeTeam.logoText,
                            home_team_logo_url: this.match.homeTeam.logoUrl,
                            away_team_id: this.match.awayTeam.id,
                            away_team_name: this.match.awayTeam.name,
                            away_team_short_code: this.match.awayTeam.shortCode,
                            away_team_logo_bg: this.match.awayTeam.logoBg,
                            away_team_logo_text: this.match.awayTeam.logoText,
                            away_team_logo_url: this.match.awayTeam.logoUrl,
                            home_score: this.match.homeScore,
                            away_score: this.match.awayScore,
                            home_penalties: this.match.homePenalties,
                            away_penalties: this.match.awayPenalties,
                            home_penalty_attempts: this.match.homePenaltyAttempts,
                            away_penalty_attempts: this.match.awayPenaltyAttempts,
                            minute: this.match.minute,
                            period: this.match.period,
                            is_live: this.match.isLive,
                            status: this.match.status,
                            stopwatch: this.match.stopwatch,
                            stopwatch_start_time: this.match.stopwatchStartTime,
                            stats: this.match.stats,
                            events: this.match.events,
                            updated_at: new Date().toISOString()
                        });
                } catch (matchErr) {
                    console.error('Error saving live match:', matchErr);
                }
            }

            // Save Match History
            for (const histMatch of this.matchHistory) {
                try {
                    await this.sb
                        .from('match_history')
                        .upsert({
                            id: histMatch.id,
                            home_team_id: histMatch.homeTeam?.id || histMatch.home_team_id,
                            home_team_name: histMatch.homeTeam?.name || histMatch.home_team_name,
                            home_team_short_code: histMatch.homeTeam?.shortCode || histMatch.home_team_short_code,
                            home_team_logo_bg: histMatch.homeTeam?.logoBg || histMatch.home_team_logo_bg,
                            home_team_logo_text: histMatch.homeTeam?.logoText || histMatch.home_team_logo_text,
                            home_team_logo_url: histMatch.homeTeam?.logoUrl || histMatch.home_team_logo_url,
                            away_team_id: histMatch.awayTeam?.id || histMatch.away_team_id,
                            away_team_name: histMatch.awayTeam?.name || histMatch.away_team_name,
                            away_team_short_code: histMatch.awayTeam?.shortCode || histMatch.away_team_short_code,
                            away_team_logo_bg: histMatch.awayTeam?.logoBg || histMatch.away_team_logo_bg,
                            away_team_logo_text: histMatch.awayTeam?.logoText || histMatch.away_team_logo_text,
                            away_team_logo_url: histMatch.awayTeam?.logoUrl || histMatch.away_team_logo_url,
                            home_score: histMatch.homeScore,
                            away_score: histMatch.awayScore,
                            home_penalties: histMatch.homePenalties,
                            away_penalties: histMatch.awayPenalties,
                            status: histMatch.status,
                            events: histMatch.events,
                            created_at: histMatch.createdAt || histMatch.created_at,
                            updated_at: new Date().toISOString()
                        });
                } catch (histErr) {
                    console.error('Error saving match history:', histErr);
                }
            }

            // Save Scheduled Matches
            for (const sm of this.scheduledMatches) {
                try {
                    await this.sb
                        .from('scheduled_matches')
                        .upsert({
                            id: sm.id,
                            home_team_id: sm.homeTeam.id,
                            home_team_name: sm.homeTeam.name,
                            home_team_short_code: sm.homeTeam.shortCode,
                            home_team_logo_bg: sm.homeTeam.logoBg,
                            home_team_logo_text: sm.homeTeam.logoText,
                            home_team_logo_url: sm.homeTeam.logoUrl,
                            away_team_id: sm.awayTeam.id,
                            away_team_name: sm.awayTeam.name,
                            away_team_short_code: sm.awayTeam.shortCode,
                            away_team_logo_bg: sm.awayTeam.logoBg,
                            away_team_logo_text: sm.awayTeam.logoText,
                            away_team_logo_url: sm.awayTeam.logoUrl,
                            match_date: sm.matchDate,
                            status: sm.status,
                            updated_at: new Date().toISOString()
                        });
                } catch (schedErr) {
                    console.error('Error saving scheduled match:', schedErr);
                }
            }
        } catch (error) {
            console.error('Error saving to Supabase:', error);
        }
    }

    saveData() {
        try {
            localStorage.setItem('teams', JSON.stringify(this.teams));
            localStorage.setItem('standings', JSON.stringify(this.standings));
            localStorage.setItem('liveMatch', JSON.stringify(this.match));
            localStorage.setItem('scheduledMatches', JSON.stringify(this.scheduledMatches));
            localStorage.setItem('matchHistory', JSON.stringify(this.matchHistory));
        } catch (e) {
            console.warn('Unable to save to local storage (possibly blocked):', e);
        }
        this.saveToSupabase();
    }

    async addTeam(name, shortCode, logoFile) {
        console.log('[addTeam] Starting with:', { name, shortCode, logoFile: logoFile?.name });

        let logoUrl = null;
        if (logoFile && this.sb) {
            try {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `teams/${fileName}`;

                console.log('[addTeam] Uploading logo to:', filePath);
                const { data, error } = await this.sb.storage
                    .from('team-logos')
                    .upload(filePath, logoFile);

                if (error) {
                    console.error('[addTeam] Logo upload error:', error);
                } else {
                    const { data: urlData } = this.sb.storage
                        .from('team-logos')
                        .getPublicUrl(filePath);
                    logoUrl = urlData.publicUrl;
                    console.log('[addTeam] Logo uploaded, URL:', logoUrl);
                }
            } catch (uploadErr) {
                console.error('[addTeam] Logo upload exception:', uploadErr);
            }
        }

        const newTeam = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            name,
            shortCode: shortCode || name.substring(0, 3).toUpperCase(),
            logoBg: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
            logoText: shortCode || name.substring(0, 2).toUpperCase(),
            logoUrl
        };

        console.log('[addTeam] New team object:', newTeam);

        this.teams.push(newTeam);
        console.log('[addTeam] teams array length:', this.teams.length);

        // Add to standings if not already there
        if (!this.standings.find(s => s.team.id === newTeam.id)) {
            this.standings.push({
                team: newTeam,
                pos: this.standings.length + 1,
                mp: 0, w: 0, d: 0, l: 0,
                gf: 0, ga: 0, gd: 0, pts: 0,
                form: []
            });
            console.log('[addTeam] Added to standings, standings length:', this.standings.length);
        }

        console.log('[addTeam] Calling saveData...');
        this.saveData();
        console.log('[addTeam] Calling notifySubscribers...');
        this.notifySubscribers();
        console.log('[addTeam] Done!');
    }

    async removeTeam(teamId) {
        console.log('[removeTeam] Starting with teamId:', teamId);
        
        if (!this.sb) {
            console.warn('[removeTeam] No Supabase connection, only removing locally');
            this.teams = this.teams.filter(t => t.id !== teamId);
            this.standings = this.standings.filter(s => s.team.id !== teamId);
            this.sortStandings();
            this.saveData();
            this.notifySubscribers();
            return;
        }

        try {
            // Remove from teams
            this.teams = this.teams.filter(t => t.id !== teamId);
            console.log('[removeTeam] After filter, teams length:', this.teams.length);

            // Remove from standings
            this.standings = this.standings.filter(s => s.team.id !== teamId);
            console.log('[removeTeam] After filter, standings length:', this.standings.length);

            // Re-calculate positions
            this.sortStandings();

            // Delete from Supabase
            console.log('[removeTeam] Deleting from Supabase...');
            const { error: teamErr } = await this.sb.from('teams').delete().eq('id', teamId);
            if (teamErr) console.error('[removeTeam] Error deleting team:', teamErr);

            const { error: standErr } = await this.sb.from('standings').delete().eq('team_id', teamId);
            if (standErr) console.error('[removeTeam] Error deleting standing:', standErr);

            console.log('[removeTeam] Save and notify...');
            this.saveData();
            this.notifySubscribers();
            console.log('[removeTeam] Done!');
        } catch (err) {
            console.error('[removeTeam] Exception:', err);
        }
    }

    startStopwatch() {
        if (this.stopwatchRunning) return;
        if (this.match.period === MATCH_PERIODS.PENALTIES) return;
        this.stopwatchRunning = true;
        if (!this.match.stopwatchStartTime) {
            this.match.stopwatchStartTime = Date.now() - this.match.stopwatch;
        }
        this.stopwatchInterval = setInterval(() => {
            this.match.stopwatch = this.getCurrentStopwatchTime();
            this.updateMatchMinuteFromStopwatch();
            this.saveData();
            this.notifySubscribers();
        }, 100);
    }

    pauseStopwatch() {
        this.stopwatchRunning = false;
        if (this.stopwatchInterval) {
            clearInterval(this.stopwatchInterval);
            this.stopwatchInterval = null;
        }
    }

    resetStopwatch() {
        this.pauseStopwatch();
        this.match.stopwatch = 0;
        this.match.stopwatchStartTime = null;
    }

    updateMatchMinuteFromStopwatch() {
        const stopwatchTime = this.getCurrentStopwatchTime();
        const totalSeconds = Math.floor(stopwatchTime / 1000);
        let minute;

        if (this.match.period === MATCH_PERIODS.FIRST_HALF) {
            minute = Math.min(45, Math.floor(totalSeconds / 60) + 1);
        } else if (this.match.period === MATCH_PERIODS.SECOND_HALF) {
            minute = 45 + Math.min(45, Math.floor(totalSeconds / 60) + 1);
        } else if (this.match.period === MATCH_PERIODS.FIRST_EXTRA_HALF) {
            minute = 90 + Math.min(15, Math.floor(totalSeconds / 60) + 1);
        } else if (this.match.period === MATCH_PERIODS.SECOND_EXTRA_HALF) {
            minute = 105 + Math.min(15, Math.floor(totalSeconds / 60) + 1);
        } else {
            minute = this.match.minute;
        }

        // Cap at 135 minutes total
        minute = Math.min(minute, 135);

        this.match.minute = minute + "'";
    }

    getCurrentStopwatchTime() {
        const MAX_STOPWATCH_MS = 135 * 60 * 1000; // 135 minutes in ms
        if (this.match && this.match.isLive && this.match.stopwatchStartTime && this.match.period !== MATCH_PERIODS.PENALTIES) {
            const elapsed = Date.now() - this.match.stopwatchStartTime;
            return Math.min(elapsed, MAX_STOPWATCH_MS);
        }
        return this.match ? Math.min(this.match.stopwatch, MAX_STOPWATCH_MS) : 0;
    }

    formatStopwatch(ms) {
        const MAX_STOPWATCH_MS = 135 * 60 * 1000;
        const cappedMs = Math.min(ms, MAX_STOPWATCH_MS);
        const totalSeconds = Math.floor(cappedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    getNearestMinuteFromStopwatch() {
        const stopwatchTime = this.getCurrentStopwatchTime();
        const totalSeconds = Math.floor(stopwatchTime / 1000);
        const minutes = Math.min(Math.floor(totalSeconds / 60), 135);
        return `${minutes}'`;
    }

    addGoal(team, player, assist, goalType = 'Regular') {
        const eventMinute = this.getNearestMinuteFromStopwatch();
        if (this.match.period === MATCH_PERIODS.PENALTIES) {
            if (team === 'home') {
                this.match.homePenalties++;
                this.match.homePenaltyAttempts.push({ scored: true, player });
            } else {
                this.match.awayPenalties++;
                this.match.awayPenaltyAttempts.push({ scored: true, player });
            }
        } else {
            if (team === 'home') {
                this.match.homeScore++;
                this.match.stats.homeShots++;
                this.match.stats.homeShotsOnTarget++;
            } else {
                this.match.awayScore++;
                this.match.stats.awayShots++;
                this.match.stats.awayShotsOnTarget++;
            }
        }

        this.match.events.unshift({
            minute: eventMinute,
            stopwatchTime: this.match.stopwatch,
            type: goalType === 'Penalty' ? EVENT_TYPES.PENALTY_GOAL : EVENT_TYPES.GOAL,
            goalType: goalType,
            team,
            player,
            assist
        });

        this.saveData();
        this.notifySubscribers();
    }

    addPenaltyMiss(team, player) {
        const eventMinute = this.getNearestMinuteFromStopwatch();
        if (team === 'home') {
            this.match.homePenaltyAttempts.push({ scored: false, player });
        } else {
            this.match.awayPenaltyAttempts.push({ scored: false, player });
        }
        this.match.events.unshift({
            minute: eventMinute,
            stopwatchTime: this.match.stopwatch,
            type: EVENT_TYPES.PENALTY_MISS,
            team,
            player
        });
        this.saveData();
        this.notifySubscribers();
    }

    addYellowCard(team, player) {
        const eventMinute = this.getNearestMinuteFromStopwatch();
        this.match.events.unshift({
            minute: eventMinute,
            stopwatchTime: this.match.stopwatch,
            type: EVENT_TYPES.YELLOW_CARD,
            team,
            player
        });
        this.saveData();
        this.notifySubscribers();
    }

    addRedCard(team, player) {
        const eventMinute = this.getNearestMinuteFromStopwatch();
        this.match.events.unshift({
            minute: eventMinute,
            stopwatchTime: this.match.stopwatch,
            type: EVENT_TYPES.RED_CARD,
            team,
            player
        });
        this.saveData();
        this.notifySubscribers();
    }

    addSubstitution(team, inPlayer, outPlayer) {
        const eventMinute = this.getNearestMinuteFromStopwatch();
        this.match.events.unshift({
            minute: eventMinute,
            stopwatchTime: this.match.stopwatch,
            type: EVENT_TYPES.SUBSTITUTION,
            team,
            inPlayer,
            outPlayer
        });
        this.saveData();
        this.notifySubscribers();
    }

    addOffside(team) {
        const eventMinute = this.getNearestMinuteFromStopwatch();
        this.match.events.unshift({
            minute: eventMinute,
            stopwatchTime: this.match.stopwatch,
            type: EVENT_TYPES.OFFSIDE,
            team
        });
        this.saveData();
        this.notifySubscribers();
    }

    addFoul(team) {
        const eventMinute = this.getNearestMinuteFromStopwatch();
        if (team === 'home') {
            this.match.stats.homeFouls++;
        } else {
            this.match.stats.awayFouls++;
        }
        this.match.events.unshift({
            minute: eventMinute,
            stopwatchTime: this.match.stopwatch,
            type: EVENT_TYPES.FOUL,
            team
        });
        this.saveData();
        this.notifySubscribers();
    }

    addSave(team) {
        const eventMinute = this.getNearestMinuteFromStopwatch();
        if (team === 'home') {
            this.match.stats.homeSaves++;
        } else {
            this.match.stats.awaySaves++;
        }
        this.match.events.unshift({
            minute: eventMinute,
            stopwatchTime: this.match.stopwatch,
            type: EVENT_TYPES.SAVE,
            team
        });
        this.saveData();
        this.notifySubscribers();
    }

    addCorner(team) {
        const eventMinute = this.getNearestMinuteFromStopwatch();
        if (team === 'home') {
            this.match.stats.homeCorners++;
        } else {
            this.match.stats.awayCorners++;
        }
        this.match.events.unshift({
            minute: eventMinute,
            stopwatchTime: this.match.stopwatch,
            type: EVENT_TYPES.CORNER,
            team
        });
        this.saveData();
        this.notifySubscribers();
    }

    addOffTarget(team) {
        const eventMinute = this.getNearestMinuteFromStopwatch();
        if (team === 'home') {
            this.match.stats.homeShots++;
        } else {
            this.match.stats.awayShots++;
        }
        this.match.events.unshift({
            minute: eventMinute,
            stopwatchTime: this.match.stopwatch,
            type: EVENT_TYPES.OFF_TARGET,
            team
        });
        this.saveData();
        this.notifySubscribers();
    }

    updatePeriod(period) {
        this.match.period = period;
        if (period === MATCH_PERIODS.PENALTIES) {
            this.pauseStopwatch();
            this.match.minute = "PEN";
        } else {
            this.resetStopwatch();
            if (period === MATCH_PERIODS.FIRST_HALF) {
                this.match.minute = "1'";
            } else if (period === MATCH_PERIODS.SECOND_HALF) {
                this.match.minute = "46'";
            } else if (period === MATCH_PERIODS.FIRST_EXTRA_HALF) {
                this.match.minute = "91'";
            } else if (period === MATCH_PERIODS.SECOND_EXTRA_HALF) {
                this.match.minute = "106'";
            }
        }
        this.saveData();
        this.notifySubscribers();
    }

    updateMinute(minute) {
        this.match.minute = minute;
        this.saveData();
        this.notifySubscribers();
    }

    updateStats(homePossession, awayPossession, homeShots, awayShots, homeShotsOnTarget, awayShotsOnTarget, homeFouls, awayFouls, homeSaves, awaySaves, homeCorners, awayCorners) {
        let validHomePossession = homePossession !== undefined ? homePossession : this.match.stats.homePossession;
        let validAwayPossession = awayPossession !== undefined ? awayPossession : this.match.stats.awayPossession;

        const totalPossession = validHomePossession + validAwayPossession;
        if (totalPossession !== 100) {
            const ratio = validHomePossession / totalPossession;
            validHomePossession = Math.round(ratio * 100);
            validAwayPossession = 100 - validHomePossession;
        }

        this.match.stats = {
            homePossession: validHomePossession,
            awayPossession: validAwayPossession,
            homeShots: homeShots !== undefined ? homeShots : this.match.stats.homeShots,
            awayShots: awayShots !== undefined ? awayShots : this.match.stats.awayShots,
            homeShotsOnTarget: homeShotsOnTarget !== undefined ? homeShotsOnTarget : this.match.stats.homeShotsOnTarget,
            awayShotsOnTarget: awayShotsOnTarget !== undefined ? awayShotsOnTarget : this.match.stats.awayShotsOnTarget,
            homeFouls: homeFouls !== undefined ? homeFouls : this.match.stats.homeFouls,
            awayFouls: awayFouls !== undefined ? awayFouls : this.match.stats.awayFouls,
            homeSaves: homeSaves !== undefined ? homeSaves : this.match.stats.homeSaves,
            awaySaves: awaySaves !== undefined ? awaySaves : this.match.stats.awaySaves,
            homeCorners: homeCorners !== undefined ? homeCorners : this.match.stats.homeCorners,
            awayCorners: awayCorners !== undefined ? awayCorners : this.match.stats.awayCorners
        };
        this.saveData();
        this.notifySubscribers();
    }

    scheduleMatch(homeTeamId, awayTeamId, matchDate) {
        console.log('[GameManager scheduleMatch] called with:', { homeTeamId, awayTeamId, matchDate });
        const homeTeam = this.teams.find(t => t.id === homeTeamId);
        const awayTeam = this.teams.find(t => t.id === awayTeamId);
        console.log('[GameManager scheduleMatch] teams:', { homeTeam, awayTeam });
        if (homeTeam && awayTeam) {
            const newMatch = {
                id: Date.now().toString(),
                ...this.createDefaultMatch(),
                homeTeam,
                awayTeam,
                matchDate: matchDate || new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
            this.scheduledMatches.push(newMatch);
            console.log('[GameManager scheduleMatch] scheduledMatches after push:', this.scheduledMatches);
            this.saveData();
            this.notifySubscribers();
        }
    }

    removeScheduledMatch(matchId) {
        console.log('[GameManager removeScheduledMatch] called with:', matchId);
        this.scheduledMatches = this.scheduledMatches.filter(m => m.id !== matchId);
        console.log('[GameManager removeScheduledMatch] scheduledMatches after:', this.scheduledMatches);
        this.saveData();
        this.notifySubscribers();
    }

    startScheduledMatch(matchId) {
        console.log('[GameManager startScheduledMatch] called with:', matchId);
        const matchToStart = this.scheduledMatches.find(m => m.id === matchId);
        console.log('[GameManager startScheduledMatch] matchToStart:', matchToStart);
        if (matchToStart) {
            this.match = {
                ...matchToStart,
                isLive: true,
                status: 'LIVE',
                period: MATCH_PERIODS.FIRST_HALF,
                stopwatch: 0,
                stopwatchStartTime: Date.now()
            };
            this.scheduledMatches = this.scheduledMatches.filter(m => m.id !== matchId);
            this.saveData();
            this.notifySubscribers();
            this.resumeStopwatchIfNeeded();
        }
    }

    startMatch() {
        this.match.isLive = true;
        this.match.status = 'LIVE';
        this.match.period = MATCH_PERIODS.FIRST_HALF;
        this.match.homeScore = 0;
        this.match.awayScore = 0;
        this.match.homePenalties = 0;
        this.match.awayPenalties = 0;
        this.match.homePenaltyAttempts = [];
        this.match.awayPenaltyAttempts = [];
        this.match.events = [];
        this.match.stats = {
            homePossession: 50,
            awayPossession: 50,
            homeShots: 0,
            awayShots: 0,
            homeShotsOnTarget: 0,
            awayShotsOnTarget: 0,
            homeFouls: 0,
            awayFouls: 0,
            homeSaves: 0,
            awaySaves: 0,
            homeCorners: 0,
            awayCorners: 0
        };
        this.resetStopwatch();
        this.startStopwatch();
        this.saveData();
        this.notifySubscribers();
    }

    pauseMatch() {
        this.pauseStopwatch();
        this.match.isLive = false;
        this.saveData();
        this.notifySubscribers();
    }

    resumeMatch() {
        this.match.isLive = true;
        this.startStopwatch();
        this.saveData();
        this.notifySubscribers();
    }

    endMatch() {
        this.pauseStopwatch();
        this.match.isLive = false;
        this.match.status = 'FULL TIME';
        this.match.period = MATCH_PERIODS.FULL_TIME;

        this.matchHistory.unshift({
            id: Date.now().toString(),
            ...this.match,
            createdAt: this.match.createdAt || new Date().toISOString()
        });

        this.updateStandings();
        this.saveData();
        this.notifySubscribers();
    }

    resetMatch() {
        this.pauseStopwatch();
        this.match = this.createDefaultMatch();
        this.saveData();
        this.notifySubscribers();
    }

    resetAllStandingsToZero() {
        this.standings = this.getDefaultStandings();
        this.saveData();
        this.notifySubscribers();
    }

    deductPoints(teamId, points) {
        const standing = this.standings.find(s => s.team.id === teamId);
        if (standing) {
            standing.pts = Math.max(0, standing.pts - points);
            this.sortStandings();
            this.saveData();
            this.notifySubscribers();
        }
    }

    updateStandings() {
        const homeStanding = this.standings.find(s => s.team.id === this.match.homeTeam.id);
        const awayStanding = this.standings.find(s => s.team.id === this.match.awayTeam.id);

        if (!homeStanding || !awayStanding) return;

        homeStanding.mp++;
        awayStanding.mp++;
        homeStanding.gf += this.match.homeScore;
        homeStanding.ga += this.match.awayScore;
        awayStanding.gf += this.match.awayScore;
        awayStanding.ga += this.match.homeScore;
        homeStanding.gd = homeStanding.gf - homeStanding.ga;
        awayStanding.gd = awayStanding.gf - awayStanding.ga;

        if (this.match.homeScore > this.match.awayScore) {
            homeStanding.w++;
            homeStanding.pts += 3;
            awayStanding.l++;
            homeStanding.form.unshift({ result: 'W' });
            awayStanding.form.unshift({ result: 'L' });
        } else if (this.match.homeScore < this.match.awayScore) {
            awayStanding.w++;
            awayStanding.pts += 3;
            homeStanding.l++;
            awayStanding.form.unshift({ result: 'W' });
            homeStanding.form.unshift({ result: 'L' });
        } else {
            homeStanding.d++;
            awayStanding.d++;
            homeStanding.pts += 1;
            awayStanding.pts += 1;
            homeStanding.form.unshift({ result: 'D' });
            awayStanding.form.unshift({ result: 'D' });
        }

        homeStanding.form = homeStanding.form.slice(0, 5);
        awayStanding.form = awayStanding.form.slice(0, 5);

        this.sortStandings();
    }

    sortStandings() {
        this.standings.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
        });

        this.standings.forEach((standing, index) => {
            standing.pos = index + 1;
        });
    }
}

let gameManager;

async function initGameManager() {
    if (!gameManager) {
        gameManager = new GameManager();
    }
    window.gameManager = gameManager;
    return gameManager;
}

initGameManager();
window.initGameManager = initGameManager;
