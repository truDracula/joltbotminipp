import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [points, setPoints] = useState(() => Number(localStorage.getItem('j_pts')) || 0);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('j_nrg')) || 100);
  const [batteryLvl, setBatteryLvl] = useState(() => Number(localStorage.getItem('j_bat')) || 1);
  const [multLvl, setMultLvl] = useState(() => Number(localStorage.getItem('j_mul')) || 1);
  const [claimed, setClaimed] = useState(() => JSON.parse(localStorage.getItem('j_clm')) || []);
  const [shakeCount, setShakeCount] = useState(() => Number(localStorage.getItem('j_shk')) || 0);
  const [streak, setStreak] = useState(() => Number(localStorage.getItem('j_str')) || 1);

  const [tab, setTab] = useState('MINE');
  const [earnTab, setEarnTab] = useState('TODAY');
  const [showPopup, setShowPopup] = useState(null);
  const [isTurbo, setIsTurbo] = useState(false);
  const [turboMult, setTurboMult] = useState(1);
  const [turboTime, setTurboTime] = useState(0);

  const lastShake = useRef(0);
  const tg = window.Telegram.WebApp;

  const maxEnergy = 100 + (batteryLvl - 1) * 500;
  const currentMult = isTurbo ? multLvl * turboMult : multLvl;
  const milestones = [100, 500, 1000, 2500, 5000, 25000, 50000, 100000];

  const LEAGUES = [
    { name: 'BRONZE', min: 0, max: 50000 },
    { name: 'SILVER', min: 50000, max: 250000 },
    { name: 'GOLD', min: 250000, max: 1000000 },
  ];
  const leagueIdx = LEAGUES.findIndex((l) => points >= l.min && points < l.max);
  const curLeague = LEAGUES[leagueIdx === -1 ? 2 : leagueIdx];

  useEffect(() => {
    localStorage.setItem('j_pts', points);
    localStorage.setItem('j_nrg', energy);
    localStorage.setItem('j_shk', shakeCount);
    localStorage.setItem('j_bat', batteryLvl);
    localStorage.setItem('j_mul', multLvl);
    localStorage.setItem('j_clm', JSON.stringify(claimed));
  }, [points, energy, shakeCount, batteryLvl, multLvl, claimed]);

  useEffect(() => {
    const timer = setInterval(() => setEnergy((e) => Math.min(maxEnergy, e + 1)), 5000);
    return () => clearInterval(timer);
  }, [maxEnergy]);

  const handleMotion = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || tab !== 'MINE') return;

    if (Math.abs(acc.x) > 12 || Math.abs(acc.y) > 12 || Math.abs(acc.z) > 12) {
      if (energy <= 0 && !isTurbo) {
        setShowPopup('SPIN');
        return;
      }

      const now = Date.now();
      if (now - lastShake.current > 150) {
        lastShake.current = now;
        setPoints((p) => p + currentMult);
        if (!isTurbo) setEnergy((en) => Math.max(0, en - 1));

        const newCount = shakeCount + 1;
        setShakeCount(newCount);

        if (milestones.includes(newCount)) setShowPopup('MILESTONE_REACHED');

        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
      }
    }
  };

  useEffect(() => {
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [energy, isTurbo, shakeCount, tab, currentMult]);

  const runSpin = () => {
    const roll = Math.random();
    let result = 1;
    if (roll < 0.7) result = (Math.random() * (1.5 - 0.5) + 0.5).toFixed(1);
    else result = (Math.random() * (10 - 2) + 2).toFixed(1);

    setTurboMult(Number(result));
    setIsTurbo(true);
    setTurboTime(30);
    setEnergy(maxEnergy);
    setShowPopup(null);
  };

  const getUnclaimedCount = () => {
    const todayUnclaimed = 1 - (claimed.includes('daily_check') ? 1 : 0);
    const milestoneUnclaimed = milestones.filter((m) => shakeCount >= m && !claimed.includes(`m_${m}`)).length;
    return todayUnclaimed + milestoneUnclaimed;
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans select-none overflow-hidden">
      <div className="p-4 flex justify-between items-center bg-[#0d0d0d] border-b border-white/5">
        <div className="flex items-center gap-3" onClick={() => setShowPopup('LEAGUE')}>
          <div className="w-10 h-10 bg-zinc-800 rounded-full border border-white/10 flex items-center justify-center text-xl"></div>
          <div>
            <p className="text-[9px] font-black opacity-40 uppercase">@{tg.initDataUnsafe?.user?.username || 'Pilot'}</p>
            <p className="text-[#CEFF00] text-[10px] font-black">{curLeague.name}</p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setTab('EARN')} className="bg-white/5 px-4 py-2 rounded-xl text-[10px] font-black italic">TASK</button>
          {getUnclaimedCount() > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center font-bold">
              {getUnclaimedCount()}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {tab === 'MINE' && (
          <div className="h-full flex flex-col items-center justify-center px-6">
            <div className="text-center mb-8">
              <h1 className="text-5xl font-black italic">{points.toLocaleString()}</h1>
            </div>

            <div className="relative">
              <motion.div
                animate={isTurbo ? { scale: [1, 1.02, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.2 }}
                className={`w-72 h-72 rounded-full border-8 flex items-center justify-center transition-all 
                ${isTurbo ? 'border-orange-500 shadow-[0_0_60px_#f97316]' : 'border-[#CEFF00]/10 bg-white/5'}`}
              >
                <span className="text-[100px] z-10">{isTurbo ? '' : '⚡'}</span>

                <AnimatePresence>
                  {energy > 0 && Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
                      transition={{ repeat: Infinity, duration: Math.random() + 0.5 }}
                      className="absolute text-[#CEFF00] text-2xl"
                      style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
                    >
                      ⚡
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>

            <div className="w-full mt-12">
              <div className="flex justify-between text-xs font-black mb-1">
                <span className="text-blue-400">⚡ {energy} / {maxEnergy}</span>
                <span className="opacity-40">{shakeCount} SHAKES</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
                <motion.div animate={{ width: `${(energy / maxEnergy) * 100}%` }} className="h-full bg-gradient-to-r from-blue-600 to-[#CEFF00]" />
              </div>
            </div>
          </div>
        )}

        {tab === 'EARN' && (
          <div className="p-6">
            <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-2xl">
              {['TODAY', 'MILESTONE', 'DONE'].map((t) => (
                <button key={t} onClick={() => setEarnTab(t)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${earnTab === t ? 'bg-[#CEFF00] text-black shadow-lg' : 'opacity-40'}`}>
                  {t}
                </button>
              ))}
            </div>

            {earnTab === 'TODAY' && (
              <div className="space-y-3">
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex justify-between items-center">
                  <div><p className="font-black">Daily Check-in</p><p className="text-[10px] text-[#CEFF00]">Day {streak} Streak</p></div>
                  <button onClick={() => { setPoints((p) => p + 5000); setClaimed([...claimed, 'daily_check']); }} disabled={claimed.includes('daily_check')} className="bg-[#CEFF00] text-black px-4 py-2 rounded-xl text-[10px] font-black disabled:opacity-30">
                    {claimed.includes('daily_check') ? 'CLAIMED' : '+5,000'}
                  </button>
                </div>
              </div>
            )}

            {earnTab === 'MILESTONE' && (
              <div className="space-y-3">
                {milestones.map((m) => (
                  <div key={m} className="bg-white/5 p-5 rounded-3xl border border-white/5 flex justify-between items-center">
                    <div><p className="font-black italic">{m.toLocaleString()} SHAKES</p><p className="text-[10px] opacity-40">{shakeCount}/{m}</p></div>
                    <button
                      disabled={shakeCount < m || claimed.includes(`m_${m}`)}
                      onClick={() => { setPoints((p) => p + 5000); setClaimed([...claimed, `m_${m}`]); }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black ${shakeCount >= m && !claimed.includes(`m_${m}`) ? 'bg-[#CEFF00] text-black' : 'bg-white/5 opacity-30'}`}
                    >
                      {claimed.includes(`m_${m}`) ? 'DONE' : '+5,000'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPopup === 'SPIN' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8">
            <div className="w-full bg-[#111] border border-white/10 rounded-[40px] p-8 text-center">
              <h2 className="text-3xl font-black italic text-[#CEFF00] mb-2">ENERGY DEPLETED</h2>
              <p className="text-xs opacity-50 mb-8">Watch an ad to spin the Multiplier Wheel and get a full refill!</p>
              <div className="h-32 flex items-center justify-center text-6xl mb-8 bg-white/5 rounded-3xl border border-dashed border-white/20"></div>
              <button onClick={runSpin} className="w-full bg-[#CEFF00] text-black font-black py-4 rounded-2xl mb-4">SPIN & REFILL</button>
              <button onClick={() => setShowPopup(null)} className="opacity-40 text-[10px] font-black uppercase">Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 pb-8 bg-black">
        <nav className="h-20 bg-[#151515] rounded-3xl border border-white/10 flex items-center justify-around">
          {['MINE', 'STORE', 'EARN', 'FRIENDS'].map((id) => (
            <button key={id} onClick={() => setTab(id)} className={`flex-1 flex flex-col items-center gap-1 transition-all ${tab === id ? 'text-[#CEFF00] scale-110' : 'text-white/20'}`}>
              <span className="text-xl">{id === 'MINE' ? '⚡' : id === 'STORE' ? '🛒' : id === 'EARN' ? '💸' : '👥'}</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">{id}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
