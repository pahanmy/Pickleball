<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pickleball Pro-Maker by Pahan</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- React & ReactDOM -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <!-- Babel for JSX -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900">
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useMemo, useEffect } = React;
        
        // Firebase Scripts are loaded via modules, but for CDN we use the compat or dynamic import
        // Using a simplified approach for the single HTML file
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        // Firebase Config (Empty by default, will be provided by environment)
        const firebaseConfig = JSON.parse(window.__firebase_config || '{}');
        const appId = window.__app_id || 'pickleball-pro-pahan';
        
        let db, auth;
        try {
            const app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
        } catch (e) {
            console.error("Firebase fail to load:", e);
        }

        const Icon = ({ name, className = "w-5 h-5" }) => {
            return <i data-lucide={name} className={className}></i>;
        };

        const App = () => {
            const [user, setUser] = useState(null);
            const [sessions, setSessions] = useState([]);
            const [currentSessionId, setCurrentSessionId] = useState(null);
            const [view, setView] = useState('menu');
            const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
            const [inputName, setInputName] = useState('');
            const [players, setPlayers] = useState([]);
            const [teams, setTeams] = useState([]);
            const [schedule, setSchedule] = useState([]);
            const [scores, setScores] = useState({});
            const [playersPerTeam, setPlayersPerTeam] = useState(2);
            const [isGenerated, setIsGenerated] = useState(false);
            const [activeTab, setActiveTab] = useState('players');
            const [isSaving, setIsSaving] = useState(false);

            useEffect(() => {
                lucide.createIcons();
            });

            useEffect(() => {
                if (!auth) return;
                const unsubscribe = onAuthStateChanged(auth, (u) => {
                    if (u) setUser(u);
                    else signInAnonymously(auth);
                });
                return () => unsubscribe();
            }, []);

            useEffect(() => {
                if (!user || !db) return;
                const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
                return onSnapshot(sessionsRef, (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setSessions(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
                });
            }, [user]);

            useEffect(() => {
                if (!user || !currentSessionId || !db) return;
                const sessionDoc = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId);
                return onSnapshot(sessionDoc, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        setPlayers(data.players || []);
                        setTeams(data.teams || []);
                        setSchedule(data.schedule || []);
                        setScores(data.scores || {});
                        setPlayersPerTeam(data.playersPerTeam || 2);
                        setIsGenerated(data.isGenerated || false);
                        setSessionDate(data.date);
                    }
                });
            }, [user, currentSessionId]);

            const createNewSession = async () => {
                if (!user || !db) return;
                setIsSaving(true);
                try {
                    const newDoc = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), {
                        date: sessionDate,
                        players: [],
                        teams: [],
                        schedule: [],
                        scores: {},
                        playersPerTeam: 2,
                        isGenerated: false,
                        createdAt: new Date().toISOString()
                    });
                    setCurrentSessionId(newDoc.id);
                    setView('active');
                    setActiveTab('players');
                } catch (e) { console.error(e); }
                finally { setIsSaving(false); }
            };

            const syncToCloud = async (newData) => {
                if (!user || !currentSessionId || !db) return;
                const sessionDoc = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId);
                await updateDoc(sessionDoc, newData);
            };

            const addPlayer = (e) => {
                e.preventDefault();
                if (!inputName.trim()) return;
                const names = inputName.split(/[\n,]+/).map(n => n.trim()).filter(n => n !== "" && !players.includes(n));
                const updatedPlayers = [...players, ...names];
                setPlayers(updatedPlayers);
                syncToCloud({ players: updatedPlayers });
                setInputName('');
            };

            const generateEverything = () => {
                if (players.length < playersPerTeam * 2) return alert(`Min ${playersPerTeam * 2} pemain.`);
                const shuffled = [...players].sort(() => Math.random() - 0.5);
                const newTeams = [];
                for (let i = 0; i < shuffled.length; i += playersPerTeam) newTeams.push(shuffled.slice(i, i + playersPerTeam));
                const newSchedule = [];
                for (let i = 0; i < newTeams.length; i++) {
                    for (let j = i + 1; j < newTeams.length; j++) newSchedule.push({ home: i, away: j });
                }
                syncToCloud({ teams: newTeams, schedule: newSchedule, scores: {}, isGenerated: true, playersPerTeam });
                setActiveTab('schedule');
            };

            const updateScore = (matchIdx, side, value) => {
                const newScores = { ...scores, [matchIdx]: { ...scores[matchIdx], [side]: parseInt(value) || 0, completed: true } };
                setScores(newScores);
                syncToCloud({ scores: newScores });
            };

            const stats = useMemo(() => {
                const teamStats = teams.map((_, i) => ({ id: i + 1, points: 0, wins: 0, members: teams[i] }));
                const pStats = {};
                players.forEach(p => pStats[p] = { points: 0, wins: 0 });
                Object.entries(scores).forEach(([idx, data]) => {
                    if (!data.completed) return;
                    const m = schedule[idx];
                    if (!m) return;
                    const winner = data.home > data.away ? 'home' : (data.away > data.home ? 'away' : null);
                    if (winner) {
                        const winTeamIdx = m[winner];
                        teamStats[winTeamIdx].points += 2;
                        teamStats[winTeamIdx].wins += 1;
                        teams[winTeamIdx].forEach(p => { if(pStats[p]) { pStats[p].points += 2; pStats[p].wins += 1; } });
                    }
                });
                return {
                    teams: [...teamStats].sort((a, b) => b.points - a.points),
                    players: Object.entries(pStats).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.points - a.points)
                };
            }, [scores, teams, schedule, players]);

            if (view === 'menu') {
                return (
                    <div className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
                        <header className="text-center mb-10">
                            <div className="inline-flex items-center justify-center p-4 bg-lime-400 rounded-3xl mb-4 shadow-xl">
                                <Icon name="trophy" className="w-10 h-10 text-slate-900" />
                            </div>
                            <h1 className="text-4xl font-black">Pickleball Pro-Maker</h1>
                            <p className="text-slate-500 italic mt-1 font-medium">by Pahan</p>
                        </header>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border mb-6">
                            <h2 className="font-bold mb-4 flex items-center gap-2 text-lime-600"><Icon name="plus" /> Sesi Baru</h2>
                            <div className="flex gap-3">
                                <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border rounded-xl font-bold outline-none" />
                                <button onClick={createNewSession} disabled={isSaving} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">
                                    {isSaving ? "Mula..." : "Mula Sesi"}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                                <Icon name="history" className="w-4 h-4" /> Rekod Sesi
                            </h2>
                            {sessions.map(s => (
                                <button key={s.id} onClick={() => { setCurrentSessionId(s.id); setView('active'); }} className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border hover:border-lime-400 transition-all group">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:text-lime-600">
                                            {new Date(s.date).getDate()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{new Date(s.date).toLocaleDateString('ms-MY', { month: 'short', year: 'numeric', day: 'numeric' })}</div>
                                            <div className="text-xs text-slate-400">{s.players?.length || 0} Pemain</div>
                                        </div>
                                    </div>
                                    <Icon name="chevron-right" className="text-slate-300" />
                                </button>
                            ))}
                        </div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto pb-24">
                    <header className="flex items-center justify-between mb-8">
                        <button onClick={() => setView('menu')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900">
                           <Icon name="chevron-left" /> Menu
                        </button>
                        <div className="text-right">
                           <div className="text-[10px] font-black text-slate-400 uppercase">Tarikh:</div>
                           <div className="font-bold">{new Date(sessionDate).toLocaleDateString('ms-MY')}</div>
                        </div>
                    </header>

                    <nav className="flex bg-white p-1 rounded-xl border mb-6 sticky top-4 z-10">
                        {['players', 'schedule', 'leaderboard'].map(tab => (
                            <button key={tab} onClick={() => isGenerated || tab === 'players' ? setActiveTab(tab) : null} className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-slate-900 text-white' : 'text-slate-500'} ${!isGenerated && tab !== 'players' ? 'opacity-30' : ''}`}>
                                {tab === 'players' ? 'Pemain' : (tab === 'schedule' ? 'Jadual' : 'Kedudukan')}
                            </button>
                        ))}
                    </nav>

                    {activeTab === 'players' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-2xl border">
                                <h2 className="font-bold mb-4 flex items-center gap-2"><Icon name="users" className="text-lime-600" /> Senarai Pemain</h2>
                                <form onSubmit={addPlayer} className="flex gap-2 mb-6">
                                    <input type="text" value={inputName} onChange={e => setInputName(e.target.value)} placeholder="Nama..." className="flex-1 px-4 py-3 bg-slate-50 rounded-xl border outline-none" />
                                    <button className="bg-slate-900 text-white px-4 rounded-xl"><Icon name="user-plus" /></button>
                                </form>
                                <div className="space-y-2">
                                    {players.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl font-bold">
                                            <span>{i+1}. {p}</span>
                                            <button onClick={() => { const up = players.filter((_, idx) => idx !== i); setPlayers(up); syncToCloud({ players: up }); }} className="text-slate-300 hover:text-red-500"><Icon name="trash-2" className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border flex flex-col justify-center text-center">
                                <label className="text-xs font-black text-slate-400 mb-4 block uppercase tracking-widest">Pemain Se-pasukan</label>
                                <div className="flex justify-center gap-3 mb-8">
                                    {[2, 3, 4].map(n => <button key={n} onClick={() => setPlayersPerTeam(n)} className={`w-12 h-12 rounded-xl border-2 font-black ${playersPerTeam === n ? 'border-lime-500 bg-lime-50 text-lime-700' : 'text-slate-300 border-slate-100'}`}>{n}</button>)}
                                </div>
                                <button onClick={generateEverything} className="py-5 bg-lime-400 text-slate-900 rounded-2xl font-black text-xl shadow-xl hover:bg-lime-500 uppercase">Jana Perlawanan</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div className="grid gap-4">
                            {schedule.map((m, idx) => (
                                <div key={idx} className="p-6 bg-white rounded-2xl border">
                                    <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">
                                        <span>Perlawanan #{idx+1}</span>
                                        {scores[idx]?.completed && <span className="text-lime-500">Selesai</span>}
                                    </div>
                                    <div className="grid grid-cols-3 items-center text-center gap-4">
                                        <div>
                                            <div className="font-bold text-sm">Pasukan {m.home+1}</div>
                                            <input type="number" value={scores[idx]?.home || ''} onChange={e => updateScore(idx, 'home', e.target.value)} placeholder="0" className="w-16 mx-auto mt-2 py-2 bg-slate-50 border rounded-xl text-center font-black text-lg outline-none" />
                                        </div>
                                        <Icon name="swords" className="w-6 h-6 mx-auto text-slate-200" />
                                        <div>
                                            <div className="font-bold text-sm">Pasukan {m.away+1}</div>
                                            <input type="number" value={scores[idx]?.away || ''} onChange={e => updateScore(idx, 'away', e.target.value)} placeholder="0" className="w-16 mx-auto mt-2 py-2 bg-slate-50 border rounded-xl text-center font-black text-lg outline-none" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'leaderboard' && (
                        <div className="space-y-8">
                            <div className="bg-white rounded-2xl border overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase">
                                            <th className="px-6 py-4">Ked.</th>
                                            <th className="px-6 py-4">Pasukan</th>
                                            <th className="px-6 py-4 text-center">Mata</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.teams.map((t, i) => (
                                            <tr key={i} className="border-b last:border-0">
                                                <td className="px-6 py-4 font-black">{i+1}</td>
                                                <td className="px-6 py-4 font-bold">Pasukan {t.id}</td>
                                                <td className="px-6 py-4 text-center"><span className="bg-slate-900 text-white px-3 py-1 rounded-full font-black">{t.points}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stats.players.map((p, i) => (
                                    <div key={p.name} className="p-4 bg-white rounded-2xl border flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs">{i+1}</div>
                                            <div className="font-bold text-slate-800">{p.name}</div>
                                        </div>
                                        <div className="font-black text-lime-600">{p.points} <span className="text-[8px] uppercase">pts</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>
