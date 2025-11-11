import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";

export default function App() {
  const DEFAULT_ADMIN_PASSWORD = 'admin123';
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('home');

  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loginPassword, setLoginPassword] = useState('');

  // --- Firebase listeners ---
  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, "teams"), (snapshot) => {
      setTeams(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      setPlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubMatches = onSnapshot(collection(db, "matches"), (snapshot) => {
      setMatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubTeams(); unsubPlayers(); unsubMatches(); }
  }, []);

  // --- Admin login ---
  function login() { if (loginPassword === DEFAULT_ADMIN_PASSWORD) setIsAdmin(true); }
  function logout() { setIsAdmin(false); setLoginPassword(''); }

  // --- Teams CRUD ---
  async function addTeam(name, logo) {
    await addDoc(collection(db, "teams"), { name, logo: logo || '', points: 0, goalsFor: 0, goalsAgainst: 0 });
  }
  async function deleteTeam(id) {
    await deleteDoc(doc(db, "teams", id));
    players.filter(p => p.teamId === id).forEach(async p => await deleteDoc(doc(db, "players", p.id)));
  }

  // --- Players CRUD ---
  async function addPlayer(name, teamId, photo) {
    await addDoc(collection(db, "players"), { name, teamId, photo: photo || '' });
  }
  async function deletePlayer(id) {
    await deleteDoc(doc(db, "players", id));
  }

  // --- Matches CRUD ---
  async function addMatch(home, away, date) {
    await addDoc(collection(db, "matches"), { home, away, date, score: null });
  }
  async function updateScore(id, score) {
    await updateDoc(doc(db, "matches", id), { score });
  }
  async function deleteMatch(id) {
    await deleteDoc(doc(db, "matches", id));
  }

  // --- Table calculation ---
  const table = teams.map(team => {
    let pts = 0, gf = 0, ga = 0;
    matches.forEach(m => {
      if (!m.score) return;
      const [h, a] = m.score.split('-').map(Number);
      if (m.home === team.name) { gf += h; ga += a; pts += h > a ? 3 : h === a ? 1 : 0; }
      else if (m.away === team.name) { gf += a; ga += h; pts += a > h ? 3 : a === h ? 1 : 0; }
    });
    return { ...team, points: pts, goalsFor: gf, goalsAgainst: ga };
  }).sort((a,b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));

  // --- UI components ---
  const Button = ({ children, onClick, color='blue', disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl text-white shadow-md transition-all duration-200 w-full md:w-auto ${disabled ? 'bg-gray-600 cursor-not-allowed' : `bg-${color}-600 hover:bg-${color}-700`}`}
    >
      {children}
    </button>
  );

  const Card = ({ children, title }) => (
    <div className="bg-gray-800 text-white rounded-2xl p-4 shadow-md border border-gray-700 w-full overflow-x-auto">
      {title && <h2 className="text-lg font-semibold mb-2 text-cyan-400">{title}</h2>}
      {children}
    </div>
  );

  function handleFileUpload(e, callback) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => callback(ev.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans" dir="rtl">
      <header className="flex flex-col md:flex-row items-center justify-between bg-gray-950 text-white p-4 shadow-lg sticky top-0 z-10 gap-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="לוגו" className="w-10 h-10 object-contain" />
          <h1 className="text-2xl font-bold text-cyan-400">מונדיאופק ⚽</h1>
        </div>
        <nav className="flex flex-wrap gap-2 md:gap-4 text-gray-300">
          <button onClick={() => setView('home')} className="hover:text-cyan-400">בית</button>
          <button onClick={() => setView('teams')} className="hover:text-cyan-400">קבוצות</button>
          <button onClick={() => setView('players')} className="hover:text-cyan-400">שחקנים</button>
          <button onClick={() => setView('matches')} className="hover:text-cyan-400">משחקים</button>
          <button onClick={() => setView('table')} className="hover:text-cyan-400">טבלה</button>
        </nav>
        <div className="w-full md:w-auto">
          {isAdmin ? <Button color="red" onClick={logout}>התנתק</Button> : (
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="password"
                placeholder="סיסמת אדמין"
                value={loginPassword}
                onChange={e=>setLoginPassword(e.target.value)}
                className="bg-gray-800 text-white px-3 py-1 rounded-lg border border-gray-700 focus:outline-none w-full md:w-auto"
              />
              <Button onClick={login}>כניסה</Button>
            </div>
          )}
        </div>
      </header>

      <main className="p-4 md:p-6 grid gap-6 max-w-6xl mx-auto">

        {/* --- Teams --- */}
        {view==='teams' && <Card title="ניהול קבוצות">
          {isAdmin && <div className="mb-4 flex flex-col md:flex-row gap-2 items-center">
            <input id="teamName" placeholder="שם קבוצה" className="bg-gray-800 px-2 py-1 rounded-lg w-full md:w-auto"/>
            <input type="file" accept="image/*" onChange={(e)=>{handleFileUpload(e,(logo)=>{const name=document.getElementById('teamName').value.trim();if(name) addTeam(name, logo);});}} className="bg-gray-800 px-2 py-1 rounded-lg w-full md:w-auto"/>
            <Button onClick={()=>{const name=document.getElementById('teamName').value.trim();if(name) addTeam(name,'');}}>הוסף</Button>
          </div>}
          <div className="grid gap-3">
            {teams.map(t=>(
              <div key={t.id} className="bg-gray-800 p-3 rounded-xl">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <img src={t.logo||'/placeholder-team.png'} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                    <span className="text-lg font-semibold">{t.name}</span>
                  </div>
                  {isAdmin && <Button color="red" onClick={()=>deleteTeam(t.id)}>מחק</Button>}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-cyan-300">שחקנים</summary>
                  <div className="grid gap-2 mt-2">
                    {players.filter(p=>p.teamId===t.id).map(p=>(
                      <div key={p.id} className="flex items-center gap-2 flex-wrap">
                        <img src={p.photo||'/placeholder-player.png'} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                        <span>{p.name}</span>
                        {isAdmin && <Button color="red" onClick={()=>deletePlayer(p.id)}>מחק</Button>}
                      </div>
                    ))}
                    {players.filter(p=>p.teamId===t.id).length===0 && <p className="text-gray-400">אין שחקנים</p>}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </Card>}

        {/* --- Players --- */}
        {view==='players' && <Card title="שחקנים">
          {isAdmin && <div className="mb-4 flex flex-col md:flex-row gap-2 items-center">
            <input id="playerName" placeholder="שם שחקן" className="bg-gray-800 px-2 py-1 rounded-lg w-full md:w-auto"/>
            <select id="playerTeam" className="bg-gray-800 px-2 py-1 rounded-lg w-full md:w-auto">{teams.map(t=>(<option key={t.id} value={t.id}>{t.name}</option>))}</select>
            <input type="file" accept="image/*" onChange={(e)=>{const name=document.getElementById('playerName').value.trim();const tid=document.getElementById('playerTeam').value;handleFileUpload(e,(photo)=>{if(name&&tid) addPlayer(name, tid, photo);});}} className="bg-gray-800 px-2 py-1 rounded-lg w-full md:w-auto"/>
            <Button onClick={()=>{const name=document.getElementById('playerName').value.trim();const tid=document.getElementById('playerTeam').value;if(name&&tid) addPlayer(name,tid,'');}}>הוסף</Button>
          </div>}
          {teams.map(t=>(
            <details key={t.id} className="mb-2">
              <summary className="cursor-pointer text-cyan-400 text-lg font-semibold">{t.name}</summary>
              <div className="grid gap-2 mt-1">
                {players.filter(p=>p.teamId===t.id).map(p=>(
                  <div key={p.id} className="flex items-center gap-2 flex-wrap">
                    <img src={p.photo||'/placeholder-player.png'} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                    <span>{p.name}</span>
                    {isAdmin && <Button color="red" onClick={()=>deletePlayer(p.id)}>מחק</Button>}
                  </div>
                ))}
                {players.filter(p=>p.teamId===t.id).length===0 && <p className="text-gray-400">אין שחקנים</p>}
              </div>
            </details>
          ))}
        </Card>}

        {/* --- Home --- */}
        {view==='home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="משחקים קרובים" className="w-full">
              {matches.length ? matches.sort((a,b)=> new Date(a.date)-new Date(b.date)).map(m => (
                <div key={m.id} className="flex justify-between items-center py-2 border-b border-gray-700 flex-wrap gap-2">
                  <span>{m.home} ⚔ {m.away}</span>
                  <span>{m.date}</span>
                  <span>{m.score || 'ללא תוצאה'}</span>
                  {isAdmin && <Button color="green" onClick={()=>{const s=prompt('תוצאה (לדוגמה 1-0)', m.score || ''); if(s) updateScore(m.id,s);}}>עדכן תוצאה</Button>}
                </div>
              )) : <p>אין משחקים עדיין</p>}
            </Card>
            <Card title="טבלת ליגה">
              <div className="overflow-x-auto">
                <table className="min-w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 text-cyan-400">
                      <th>מקום</th><th>קבוצה</th><th>נק'</th><th>זכות</th><th>חובה</th><th>הפרש</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((t,i)=>(
                      <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td>{i+1}</td>
                        <td className="flex items-center gap-2"><img src={t.logo || '/placeholder-team.png'} alt={t.name} className="w-6 h-6 rounded-full" />{t.name}</td>
                        <td>{t.points}</td>
                        <td>{t.goalsFor}</td>
                        <td>{t.goalsAgainst}</td>
                        <td>{t.goalsFor - t.goalsAgainst}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* --- Matches --- */}
        {view==='matches' && <Card title="ניהול משחקים">
          {isAdmin && <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
            <select id="homeTeam" className="bg-gray-800 px-2 py-1 rounded-lg w-full md:w-auto">{teams.map(t=>(<option key={t.id}>{t.name}</option>))}</select>
            <select id="awayTeam" className="bg-gray-800 px-2 py-1 rounded-lg w-full md:w-auto">{teams.map(t=>(<option key={t.id}>{t.name}</option>))}</select>
            <input type="date" id="matchDate" className="bg-gray-800 px-2 py-1 rounded-lg w-full md:w-auto"/>
            <Button onClick={()=>{const h=document.getElementById('homeTeam').value; const a=document.getElementById('awayTeam').value; const d=document.getElementById('matchDate').value; if(h&&a&&d) addMatch(h,a,d);}}>הוסף משחק</Button>
          </div>}
          {matches.map(m=>(
            <div key={m.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-xl flex-wrap gap-2">
              <div className="flex flex-col">
                <span>{m.home} ⚔ {m.away}</span>
                <span className="text-sm text-cyan-300">{m.date}</span>
              </div>
              <span>{m.score || 'ללא תוצאה'}</span>
              {isAdmin && <Button color="green" onClick={()=>{const s=prompt('תוצאה (לדוגמה 1-0)', m.score || ''); if(s) updateScore(m.id,s);}}>עדכן תוצאה</Button>}
              {isAdmin && <Button color="red" onClick={()=>deleteMatch(m.id)}>מחק</Button>}
            </div>
          ))}
        </Card>}

        {/* --- Table --- */}
        {view==='table' && <Card title="טבלת ליגה מלאה">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-gray-700 text-cyan-400">
                  <th>מקום</th><th>קבוצה</th><th>נק'</th><th>זכות</th><th>חובה</th><th>הפרש</th>
                </tr>
              </thead>
              <tbody>
                {table.map((t,i)=>(
                  <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td>{i+1}</td>
                    <td className="flex items-center gap-2"><img src={t.logo || '/placeholder-team.png'} alt={t.name} className="w-6 h-6 rounded-full" />{t.name}</td>
                    <td>{t.points}</td>
                    <td>{t.goalsFor}</td>
                    <td>{t.goalsAgainst}</td>
                    <td>{t.goalsFor - t.goalsAgainst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>}

      </main>
<footer className="bg-gray-950 text-gray-400 text-center py-4 mt-6">
  נבנה עי אביתר בורשן © {new Date().getFullYear()}
</footer>
    </div>
  );
}
