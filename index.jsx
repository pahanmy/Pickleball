import React, { useState, useMemo } from 'react';
import { Users, Shuffle, Trash2, UserPlus, Trophy, LayoutGrid, Info, Calendar, Swords, ChevronRight, Medal, CheckCircle2 } from 'lucide-react';

const App = () => {
  const [inputName, setInputName] = useState('');
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [scores, setScores] = useState({}); // { matchIndex: { home: num, away: num, completed: bool } }
  const [playersPerTeam, setPlayersPerTeam] = useState(2);
  const [isGenerated, setIsGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState('players'); // 'players', 'schedule', 'leaderboard'

  const addPlayer = (e) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    const names = inputName.split(/[\n,]+/).map(n => n.trim()).filter(n => n !== "" && !players.includes(n));
    setPlayers([...players, ...names]);
    setInputName('');
  };

  const removePlayer = (index) => {
    const newPlayers = players.filter((_, i) => i !== index);
    setPlayers(newPlayers);
    if (newPlayers.length === 0) {
      resetSystem();
    }
  };

  const resetSystem = () => {
    setTeams([]);
    setSchedule([]);
    setScores({});
    setIsGenerated(false);
    setActiveTab('players');
  };

  const clearAll = () => {
    if (confirm("Adakah anda pasti mahu memadam semua data?")) {
      setPlayers([]);
      resetSystem();
    }
  };

  const generateEverything = () => {
    if (players.length < playersPerTeam * 2) {
      alert(`Anda perlukan sekurang-kurangnya ${playersPerTeam * 2} pemain.`);
      return;
    }

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const newTeams = [];
    for (let i = 0; i < shuffled.length; i += playersPerTeam) {
      newTeams.push(shuffled.slice(i, i + playersPerTeam));
    }
    setTeams(newTeams);

    const newSchedule = [];
    for (let i = 0; i < newTeams.length; i++) {
      for (let j = i + 1; j < newTeams.length; j++) {
        newSchedule.push({ home: i, away: j });
      }
    }

    setSchedule(newSchedule);
    setScores({});
    setIsGenerated(true);
    setActiveTab('schedule');
  };

  const updateScore = (matchIdx, side, value) => {
    const val = parseInt(value) || 0;
    setScores(prev => ({
      ...prev,
      [matchIdx]: { 
        ...prev[matchIdx], 
        [side]: val,
        completed: true 
      }
    }));
  };

  // Pengiraan Statistik
  const stats = useMemo(() => {
    const teamStats = teams.map((_, i) => ({ id: i + 1, points: 0, wins: 0, losses: 0, members: teams[i] }));
    const playerStats = {};
    players.forEach(p => { playerStats[p] = { points: 0, wins: 0 }; });

    Object.entries(scores).forEach(([matchIdx, data]) => {
      if (!data.completed) return;
      
      const match = schedule[matchIdx];
      const hScore = data.home || 0;
      const aScore = data.away || 0;

      if (hScore > aScore) {
        // Home Win
        teamStats[match.home].points += 2;
        teamStats[match.home].wins += 1;
        teamStats[match.away].losses += 1;
        teams[match.home].forEach(p => { if(playerStats[p]) { playerStats[p].points += 2; playerStats[p].wins += 1; } });
      } else if (aScore > hScore) {
        // Away Win
        teamStats[match.away].points += 2;
        teamStats[match.away].wins += 1;
        teamStats[match.home].losses += 1;
        teams[match.away].forEach(p => { if(playerStats[p]) { playerStats[p].points += 2; playerStats[p].wins += 1; } });
      }
    });

    return {
      teams: [...teamStats].sort((a, b) => b.points - a.points),
      players: Object.entries(playerStats)
        .map(([name, stat]) => ({ name, ...stat }))
        .sort((a, b) => b.points - a.points)
    };
  }, [scores, teams, schedule, players]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-lime-400 rounded-2xl mb-4 shadow-sm">
            <Trophy className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pickleball Pro-Maker</h1>
          <p className="text-slate-500 mt-2 font-medium italic">Sistem Pengurusan Perlawanan & Pemarkahan by Pahan</p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-6 sticky top-4 z-10 overflow-x-auto">
          <button onClick={() => setActiveTab('players')} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'players' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Users className="w-4 h-4" /> Pemain
          </button>
          <button onClick={() => isGenerated && setActiveTab('schedule')} disabled={!isGenerated} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'schedule' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'} ${!isGenerated ? 'opacity-30' : ''}`}>
            <Calendar className="w-4 h-4" /> Jadual
          </button>
          <button onClick={() => isGenerated && setActiveTab('leaderboard')} disabled={!isGenerated} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'} ${!isGenerated ? 'opacity-30' : ''}`}>
            <Medal className="w-4 h-4" /> Kedudukan
          </button>
        </div>

        {/* Tab Content: Players */}
        {activeTab === 'players' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700"><UserPlus className="w-5 h-5 text-lime-600" /> Daftar Pemain</h2>
                {players.length > 0 && <button onClick={clearAll} className="text-red-500 p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>}
              </div>
              <form onSubmit={addPlayer} className="mb-6">
                <div className="flex gap-2">
                  <input type="text" value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder="Nama pemain..." className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-lime-500 outline-none transition-all" />
                  <button type="submit" className="bg-slate-900 text-white px-4 rounded-xl hover:bg-slate-800"><UserPlus className="w-6 h-6" /></button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-wider">* Boleh masukkan banyak nama sekaligus (guna koma)</p>
              </form>
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                {players.length === 0 ? <div className="text-center py-12 text-slate-400 italic">Senarai kosong</div> : 
                  players.map((name, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl group border border-transparent hover:border-slate-200 transition-all">
                      <span className="font-bold text-slate-700">{index + 1}. {name}</span>
                      <button onClick={() => removePlayer(index)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
              <h2 className="text-lg font-bold mb-4 text-slate-700">Tetapan & Mula</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase block mb-3">Pemain Per Pasukan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[2, 3, 4].map(num => (
                      <button key={num} onClick={() => setPlayersPerTeam(num)} className={`py-3 rounded-xl border-2 font-black transition-all ${playersPerTeam === num ? 'border-lime-500 bg-lime-50 text-lime-700' : 'border-slate-100 text-slate-300'}`}>
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={generateEverything} className="w-full py-5 bg-lime-400 text-slate-900 rounded-2xl font-black text-xl shadow-xl shadow-lime-100 hover:bg-lime-500 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tight">
                  <Shuffle className="w-7 h-7" /> Bina Perlawanan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Schedule */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 italic uppercase"><Calendar className="w-6 h-6 text-lime-500" /> Jadual & Markah</h2>
              <span className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full">{schedule.length} PERLAWANAN</span>
            </div>
            
            <div className="grid gap-4">
              {schedule.map((match, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border-2 transition-all ${scores[idx]?.completed ? 'bg-white border-lime-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">PERLAWANAN #{idx + 1}</span>
                    {scores[idx]?.completed && <span className="flex items-center gap-1 text-[10px] text-lime-600 font-black bg-lime-50 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> SELESAI</span>}
                  </div>
                  
                  <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                    {/* Home Team */}
                    <div className="text-center space-y-2">
                      <div className="text-sm font-black text-slate-800">PASUKAN {match.home + 1}</div>
                      <div className="text-[10px] text-slate-400 flex flex-wrap justify-center gap-1">
                        {teams[match.home].map((p, i) => <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded">{p}</span>)}
                      </div>
                      <input 
                        type="number" 
                        value={scores[idx]?.home || ''} 
                        onChange={(e) => updateScore(idx, 'home', e.target.value)}
                        placeholder="0"
                        className="w-16 text-center py-2 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-lg focus:border-lime-400 outline-none"
                      />
                    </div>

                    <div className="flex flex-col items-center">
                      <Swords className="w-5 h-5 text-slate-300" />
                      <div className="text-[10px] font-black text-slate-300 mt-1 uppercase">VS</div>
                    </div>

                    {/* Away Team */}
                    <div className="text-center space-y-2">
                      <div className="text-sm font-black text-slate-800">PASUKAN {match.away + 1}</div>
                      <div className="text-[10px] text-slate-400 flex flex-wrap justify-center gap-1">
                        {teams[match.away].map((p, i) => <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded">{p}</span>)}
                      </div>
                      <input 
                        type="number" 
                        value={scores[idx]?.away || ''} 
                        onChange={(e) => updateScore(idx, 'away', e.target.value)}
                        placeholder="0"
                        className="w-16 text-center py-2 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-lg focus:border-lime-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
            {/* Team Ranking */}
            <section>
              <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 italic uppercase"><LayoutGrid className="w-6 h-6 text-lime-500" /> Ranking Pasukan</h2>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Ked.</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Pasukan</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">M-K</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Mata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.teams.map((t, idx) => (
                      <tr key={t.id} className={`border-b border-slate-100 last:border-0 ${idx === 0 ? 'bg-lime-50/30' : ''}`}>
                        <td className="px-6 py-4">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 text-sm">Pasukan {t.id}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{t.members.join(', ')}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-600 text-sm">{t.wins}-{t.losses}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full font-black text-sm ${idx === 0 ? 'bg-lime-400 text-slate-900' : 'bg-slate-900 text-white'}`}>
                            {t.points}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Individual Ranking */}
            <section>
              <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 italic uppercase"><Medal className="w-6 h-6 text-orange-500" /> Pemain Paling Kuat (Individu)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.players.map((p, idx) => (
                  <div key={p.name} className={`p-4 rounded-2xl border-2 flex items-center justify-between ${idx === 0 ? 'border-orange-200 bg-orange-50 shadow-md scale-105' : 'border-slate-100 bg-white shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{p.wins} Kemenangan</div>
                      </div>
                    </div>
                    <div className="text-right px-3 py-1 bg-slate-900 text-white rounded-lg font-black text-sm">
                      {p.points} <span className="text-[8px] text-slate-400">PTS</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Footer info */}
        <footer className="mt-12 text-center text-slate-400 text-sm">
          Aplikasi Penjana Pasukan & Skor Pickleball &copy; {new Date().getFullYear()}
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">Win = 2 pts | Loss = 0 pts</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
