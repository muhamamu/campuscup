// Type Definitions
interface Team {
    id: string;
    name: string;
    shortCode: string;
    logoBg: string;
    logoText: string;
}

interface MatchEvent {
    minute: string;
    type: 'goal' | 'yellow-card' | 'red-card' | 'substitution';
    team: 'home' | 'away';
    player: string;
    assist?: string;
    inPlayer?: string;
    outPlayer?: string;
}

interface Match {
    homeTeam: Team;
    awayTeam: Team;
    homeScore: number;
    awayScore: number;
    minute: string;
    isLive: boolean;
    events: MatchEvent[];
}

interface FormResult {
    result: 'W' | 'D' | 'L';
}

interface Standing {
    pos: number;
    team: Team;
    mp: number;
    w: number;
    d: number;
    l: number;
    gf: number;
    ga: number;
    gd: number;
    pts: number;
    form: FormResult[];
}

// Team Data
const teams: Team[] = [
    { id: 'software200l', name: 'Software 200L', shortCode: 'S2', logoBg: '#1a061e', logoText: 'S2' },
    { id: 'software100l', name: 'Software 100L', shortCode: 'S1', logoBg: '#c2410c', logoText: 'S1' },
    { id: 'chinedu', name: "Chinedu's Team", shortCode: 'CT', logoBg: '#991b1b', logoText: 'CT' },
    { id: 'electrical', name: 'Electrical Engineering 200L', shortCode: 'EE', logoBg: '#1e3a8a', logoText: 'EE' },
    { id: 'mechatronics', name: 'Mechatronics 200L', shortCode: 'MEC', logoBg: '#0891b2', logoText: 'MEC' },
    { id: 'civil', name: 'Civil Engineering 100L', shortCode: 'CIV', logoBg: '#059669', logoText: 'CIV' },
    { id: 'architecture', name: 'Architecture 100L', shortCode: 'ARC', logoBg: '#7c3aed', logoText: 'ARC' },
    { id: 'theatre', name: 'Theatre Art 200L', shortCode: 'EAG', logoBg: '#581c87', logoText: 'EAG' }
];

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateForm(): FormResult[] {
    const results: Array<'W' | 'D' | 'L'> = ['W', 'D', 'L'];
    const form: FormResult[] = [];
    for (let i = 0; i < 5; i++) {
        form.push({ result: results[randomInt(0, 2)] });
    }
    return form;
}

function generateStanding(team: Team, basePts: number): Standing {
    const mp = randomInt(25, 30);
    const w = randomInt(10, 22);
    const d = randomInt(3, 10);
    const l = mp - w - d;
    const gf = randomInt(30, 70);
    const ga = randomInt(15, 45);
    const gd = gf - ga;
    const pts = w * 3 + d;

    return {
        pos: 0,
        team,
        mp, w, d, l,
        gf, ga, gd, pts,
        form: generateForm()
    };
}

const initialStandingsData: Standing[] = teams.map((team, index) => 
    generateStanding(team, 60 - index * 5)
);

initialStandingsData.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
});

initialStandingsData.forEach((standing, index) => {
    standing.pos = index + 1;
});

let initialStandings: Standing[] = initialStandingsData;

// Match Stats Interface
interface MatchStats {
    homePossession: number;
    awayPossession: number;
    homeShots: number;
    awayShots: number;
    homeShotsOnTarget: number;
    awayShotsOnTarget: number;
}

// Current Live Match
let currentMatch: Match & { status: string; stats: MatchStats } = {
    homeTeam: teams[1],
    awayTeam: teams[3],
    homeScore: 0,
    awayScore: 0,
    minute: "0'",
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

class GameManager {
    private standings: Standing[];
    private match: Match;
    private subscribers: Array<(standings: Standing[], match: Match) => void>;

    constructor() {
        this.standings = JSON.parse(localStorage.getItem('standings') || JSON.stringify(initialStandings));
        this.match = JSON.parse(localStorage.getItem('liveMatch') || JSON.stringify(currentMatch));
        this.subscribers = [];
    }

    subscribe(callback: (standings: Standing[], match: Match) => void) {
        this.subscribers.push(callback);
        callback(this.standings, this.match);
    }

    private notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.standings, this.match));
    }

    private saveData() {
        localStorage.setItem('standings', JSON.stringify(this.standings));
        localStorage.setItem('liveMatch', JSON.stringify(this.match));
    }

    getStandings(): Standing[] {
        return this.standings;
    }

    getMatch(): Match {
        return this.match;
    }

    addGoal(team: 'home' | 'away', player: string, assist?: string) {
        if (team === 'home') {
            this.match.homeScore++;
        } else {
            this.match.awayScore++;
        }
        this.match.events.unshift({
            minute: this.match.minute,
            type: 'goal',
            team,
            player,
            assist
        });
        this.saveData();
        this.notifySubscribers();
    }

    addYellowCard(team: 'home' | 'away', player: string) {
        this.match.events.unshift({
            minute: this.match.minute,
            type: 'yellow-card',
            team,
            player
        });
        this.saveData();
        this.notifySubscribers();
    }

    addRedCard(team: 'home' | 'away', player: string) {
        this.match.events.unshift({
            minute: this.match.minute,
            type: 'red-card',
            team,
            player
        });
        this.saveData();
        this.notifySubscribers();
    }

    addSubstitution(team: 'home' | 'away', inPlayer: string, outPlayer: string) {
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

    updateMinute(minute: string) {
        this.match.minute = minute;
        this.saveData();
        this.notifySubscribers();
    }

    endMatch() {
        this.match.isLive = false;
        this.updateStandings();
        this.saveData();
        this.notifySubscribers();
    }

    resetMatch() {
        this.match = JSON.parse(JSON.stringify(currentMatch));
        this.standings = JSON.parse(JSON.stringify(initialStandings));
        this.saveData();
        this.notifySubscribers();
    }

    private updateStandings() {
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

    private sortStandings() {
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

const gameManager = new GameManager();
