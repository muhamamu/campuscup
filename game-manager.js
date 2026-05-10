// Team Data
const teams = [
    { id: 'software200l', name: 'Software 200L', shortCode: 'S2', logoBg: '#1a061e', logoText: 'S2' },
    { id: 'software100l', name: 'Software 100L', shortCode: 'S1', logoBg: '#c2410c', logoText: 'S1' },
    { id: 'chinedu', name: "Chinedu's Team", shortCode: 'CT', logoBg: '#991b1b', logoText: 'CT' },
    { id: 'electrical', name: 'Electrical Engineering 200L', shortCode: 'EE', logoBg: '#1e3a8a', logoText: 'EE' },
    { id: 'mechatronics', name: 'Mechatronics 200L', shortCode: 'MEC', logoBg: '#0891b2', logoText: 'MEC' },
    { id: 'civil', name: 'Civil Engineering 100L', shortCode: 'CIV', logoBg: '#059669', logoText: 'CIV' },
    { id: 'architecture', name: 'Architecture 100L', shortCode: 'ARC', logoBg: '#7c3aed', logoText: 'ARC' },
    { id: 'theatre', name: 'Theatre Art 200L', shortCode: 'EAG', logoBg: '#581c87', logoText: 'EAG' }
];

// Match Periods
const MATCH_PERIODS = {
    FIRST_HALF: 'FIRST_HALF',
    SECOND_HALF: 'SECOND_HALF',
    FIRST_EXTRA_HALF: 'FIRST_EXTRA_HALF',
    SECOND_EXTRA_HALF: 'SECOND_EXTRA_HALF',
    PENALTIES: 'PENALTIES'
};

class GameManager {
    constructor() {
        this.standings = [];
        this.match = null;
        this.subscribers = [];
        this.sb = null;
        this.init();
    }

    async init() {
        try {
            this.sb = await getSupabase();
            await this.loadFromSupabase();
        } catch (error) {
            console.error('Error initializing GameManager:', error);
            this.loadFallbackData();
        }
    }

    loadFallbackData() {
        const localStorageStandings = localStorage.getItem('standings');
        const localStorageMatch = localStorage.getItem('liveMatch');
        
        if (localStorageStandings) {
            this.standings = JSON.parse(localStorageStandings);
        } else {
            this.standings = teams.map((team, index) => ({
                team,
                pos: index + 1,
                mp: 0, w: 0, d: 0, l: 0,
                gf: 0, ga: 0, gd: 0, pts: 0,
                form: []
            }));
        }

        if (localStorageMatch) {
            this.match = JSON.parse(localStorageMatch);
        } else {
            this.match = {
                homeTeam: teams[1],
                awayTeam: teams[3],
                homeScore: 0,
                awayScore: 0,
                homePenalties: 0,
                awayPenalties: 0,
                minute: "0'",
                period: MATCH_PERIODS.FIRST_HALF,
                isLive: false,
                status: 'SCHEDULED',
                stats: { 
                    homePossession: 50,
                    awayPossession: 50,
                    homeShots: 0,
                    awayShots: 0,
                    homeShotsOnTarget: 0,
                    awayShotsOnTarget: 0
                },
                events: []
            };
        }
        
        this.notifySubscribers();
    }

    async loadFromSupabase() {
        try {
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
                        logoText: row.team_logo_text
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
                this.loadFallbackData();
                return;
            }

            const { data: matchData } = await this.sb
                .from('live_match')
                .select('*')
                .limit(1)
                .single();

            if (matchData) {
                this.match = {
                    homeTeam: {
                        id: matchData.home_team_id,
                        name: matchData.home_team_name,
                        shortCode: matchData.home_team_short_code,
                        logoBg: matchData.home_team_logo_bg,
                        logoText: matchData.home_team_logo_text
                    },
                    awayTeam: {
                        id: matchData.away_team_id,
                        name: matchData.away_team_name,
                        shortCode: matchData.away_team_short_code,
                        logoBg: matchData.away_team_logo_bg,
                        logoText: matchData.away_team_logo_text
                    },
                    homeScore: matchData.home_score,
                    awayScore: matchData.away_score,
                    homePenalties: matchData.home_penalties,
                    awayPenalties: matchData.away_penalties,
                    minute: matchData.minute,
                    period: matchData.period,
                    isLive: matchData.is_live,
                    status: matchData.status,
                    stats: matchData.stats || {},
                    events: matchData.events || []
                };
            } else {
                this.loadFallbackData();
                return;
            }

            this.notifySubscribers();
        } catch (error) {
            console.error('Error loading from Supabase:', error);
            this.loadFallbackData();
        }
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        if (this.standings.length > 0 && this.match) {
            callback(this.standings, this.match);
        }
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.standings, this.match));
    }

    async saveToSupabase() {
        if (!this.sb) return;

        try {
            for (const standing of this.standings) {
                await this.sb
                    .from('standings')
                    .upsert({
                        team_id: standing.team.id,
                        team_name: standing.team.name,
                        team_short_code: standing.team.shortCode,
                        team_logo_bg: standing.team.logoBg,
                        team_logo_text: standing.team.logoText,
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
            }

            if (this.match) {
                await this.sb
                    .from('live_match')
                    .upsert({
                        id: 1,
                        home_team_id: this.match.homeTeam.id,
                        home_team_name: this.match.homeTeam.name,
                        home_team_short_code: this.match.homeTeam.shortCode,
                        home_team_logo_bg: this.match.homeTeam.logoBg,
                        home_team_logo_text: this.match.homeTeam.logoText,
                        away_team_id: this.match.awayTeam.id,
                        away_team_name: this.match.awayTeam.name,
                        away_team_short_code: this.match.awayTeam.shortCode,
                        away_team_logo_bg: this.match.awayTeam.logoBg,
                        away_team_logo_text: this.match.awayTeam.logoText,
                        home_score: this.match.homeScore,
                        away_score: this.match.awayScore,
                        home_penalties: this.match.homePenalties,
                        away_penalties: this.match.awayPenalties,
                        minute: this.match.minute,
                        period: this.match.period,
                        is_live: this.match.isLive,
                        status: this.match.status,
                        stats: this.match.stats,
                        events: this.match.events,
                        updated_at: new Date().toISOString()
                    });
            }
        } catch (error) {
            console.error('Error saving to Supabase:', error);
        }
    }

    saveData() {
        localStorage.setItem('standings', JSON.stringify(this.standings));
        localStorage.setItem('liveMatch', JSON.stringify(this.match));
        this.saveToSupabase();
    }

    getStandings() {
        return this.standings;
    }

    getMatch() {
        return this.match;
    }

    addGoal(team, player, assist, isPenalty = false) {
        if (this.match.period === MATCH_PERIODS.PENALTIES) {
            if (team === 'home') {
                this.match.homePenalties++;
            } else {
                this.match.awayPenalties++;
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
            minute: this.match.minute,
            type: isPenalty ? 'penalty-goal' : 'goal',
            team,
            player,
            assist
        });
        this.saveData();
        this.notifySubscribers();
    }

    addPenaltyMiss(team, player) {
        this.match.events.unshift({
            minute: this.match.minute,
            type: 'penalty-miss',
            team,
            player
        });
        this.saveData();
        this.notifySubscribers();
    }

    updatePeriod(period) {
        this.match.period = period;
        if (period === MATCH_PERIODS.FIRST_HALF) {
            this.match.minute = "1'";
        } else if (period === MATCH_PERIODS.SECOND_HALF) {
            this.match.minute = "46'";
        } else if (period === MATCH_PERIODS.FIRST_EXTRA_HALF) {
            this.match.minute = "91'";
        } else if (period === MATCH_PERIODS.SECOND_EXTRA_HALF) {
            this.match.minute = "106'";
        } else if (period === MATCH_PERIODS.PENALTIES) {
            this.match.minute = "PEN";
        }
        this.saveData();
        this.notifySubscribers();
    }

    addYellowCard(team, player) {
        this.match.events.unshift({
            minute: this.match.minute,
            type: 'yellow-card',
            team,
            player
        });
        this.saveData();
        this.notifySubscribers();
    }

    addRedCard(team, player) {
        this.match.events.unshift({
            minute: this.match.minute,
            type: 'red-card',
            team,
            player
        });
        this.saveData();
        this.notifySubscribers();
    }

    addSubstitution(team, inPlayer, outPlayer) {
        this.match.events.unshift({
            minute: this.match.minute,
            type: 'substitution',
            team,
            player: outPlayer,
            inPlayer,
            outPlayer
        });
        this.saveData();
        this.notifySubscribers();
    }

    updateMinute(minute) {
        this.match.minute = minute;
        this.saveData();
        this.notifySubscribers();
    }

    updateStats(homePossession, awayPossession, homeShots, awayShots, homeShotsOnTarget, awayShotsOnTarget) {
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
            awayShotsOnTarget: awayShotsOnTarget !== undefined ? awayShotsOnTarget : this.match.stats.awayShotsOnTarget
        };
        this.saveData();
        this.notifySubscribers();
    }

    scheduleMatch(homeTeamId, awayTeamId) {
        const homeTeam = teams.find(t => t.id === homeTeamId);
        const awayTeam = teams.find(t => t.id === awayTeamId);
        if (homeTeam && awayTeam) {
            this.match = {
                homeTeam,
                awayTeam,
                homeScore: 0,
                awayScore: 0,
                homePenalties: 0,
                awayPenalties: 0,
                minute: "0'",
                period: MATCH_PERIODS.FIRST_HALF,
                isLive: false,
                status: 'SCHEDULED',
                stats: { 
                    homePossession: 50,
                    awayPossession: 50,
                    homeShots: 0,
                    awayShots: 0,
                    homeShotsOnTarget: 0,
                    awayShotsOnTarget: 0
                },
                events: []
            };
            this.saveData();
            this.notifySubscribers();
        }
    }

    startMatch() {
        this.match.isLive = true;
        this.match.status = 'LIVE';
        this.match.period = MATCH_PERIODS.FIRST_HALF;
        this.match.minute = "1'";
        this.match.homeScore = 0;
        this.match.awayScore = 0;
        this.match.homePenalties = 0;
        this.match.awayPenalties = 0;
        this.match.events = [];
        this.match.stats = { 
            homePossession: 50,
            awayPossession: 50,
            homeShots: 0,
            awayShots: 0,
            homeShotsOnTarget: 0,
            awayShotsOnTarget: 0
        };
        this.saveData();
        this.notifySubscribers();
    }

    endMatch() {
        this.match.isLive = false;
        this.match.status = 'FULL TIME';
        this.updateStandings();
        this.saveData();
        this.notifySubscribers();
    }

    resetMatch() {
        this.match = {
            homeTeam: teams[1],
            awayTeam: teams[3],
            homeScore: 0,
            awayScore: 0,
            homePenalties: 0,
            awayPenalties: 0,
            minute: "0'",
            period: MATCH_PERIODS.FIRST_HALF,
            isLive: false,
            status: 'SCHEDULED',
            stats: { 
                homePossession: 50,
                awayPossession: 50,
                homeShots: 0,
                awayShots: 0,
                homeShotsOnTarget: 0,
                awayShotsOnTarget: 0
            },
            events: []
        };
        this.standings = teams.map((team, index) => ({
            team,
            pos: index + 1,
            mp: 0, w: 0, d: 0, l: 0,
            gf: 0, ga: 0, gd: 0, pts: 0,
            form: []
        }));
        this.saveData();
        this.notifySubscribers();
    }

    resetAllStandingsToZero() {
        this.standings = this.standings.map(standing => ({
            ...standing,
            pos: 0,
            mp: 0,
            w: 0,
            d: 0,
            l: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
            form: []
        }));
        this.sortStandings();
        this.saveData();
        this.notifySubscribers();
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

// Initialize when the script loads
initGameManager();

// Expose globally
window.initGameManager = initGameManager;
