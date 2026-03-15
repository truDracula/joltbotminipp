import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [points, setPoints] = useState(() => Number(localStorage.getItem('j_pts')) || 0);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('j_nrg')) || 100);
  const [batteryLvl, setBatteryLvl] = useState(() => Number(localStorage.getItem('j_bat')) || 1);
  const [multLvl, setMultLvl] = useState(() => Number(localStorage.getItem('j_mul')) || 1);
  const [tasksClaimed, setTasksClaimed] = useState(() => JSON.parse(localStorage.getItem('j_tsk')) || []);

  const [tab, setTab] = useState('MINE');
  const [showPopup, setShowPopup] = useState(null);
  const [isTurbo, setIsTurbo] = useState(false);
  const [turboMult, setTurboMult] = useState(1);
  const [turboTime, setTurboTime] = useState(0);
  const [shakeCount, setShakeCount] = useState(0);
  const [dailyRefills, setDailyRefills] = useState(10);

  const lastShake = useRef(0);
  const tg = window.Telegram.WebApp;
  const userName = tg.initDataUnsafe?.user?.username || 'Operator';

  const maxEnergy = 100 + (batteryLvl - 1) * 500;
  const currentMult = isTurbo ? multLvl * turboMult : multLvl;
  const multCost = Math.floor(2000 * Math.pow(2.5, multLvl - 1));
  const batCost = Math.floor(1000 * Math.pow(2.2, batteryLvl - 1));

  const LEAGUES = [
    { name: 'BRONZE', min: 0, max: 50000 },
    { name: 'SILVER', min: 50000, max: 250000 },
    { name: 'GOLD', min: 250000, max: 1000000 },
    { name: 'PLATINUM', min: 1000000, max: 5000000 },
    { name: 'DIAMOND', min: 5000000, max: Infinity },
  ];
  const leagueIdx = LEAGUES.findIndex((l) => points >= l.min && points < l.max);
  const currentLeague = LEAGUES[leagueIdx === -1 ? 4 : leagueIdx];

  useEffect(() => {
    localStorage.setItem('j_pts', points);
    localStorage.setItem('j_bat', batteryLvl);
    localStorage.setItem('j_mul', multLvl);
    localStorage.setItem('j_nrg', energy);
    localStorage.setItem('j_tsk', JSON.stringify(tasksClaimed));
  }, [points, batteryLvl, multLvl, energy, tasksClaimed]);

  useEffect(() => {
    const timer = setInterval(() => setEnergy((e) => Math.min(maxEnergy, e + 1)), 5000);
    return () => clearInterval(timer);
  }, [maxEnergy]);

  const handleMotion = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || tab !== 'MINE') return;

    if (Math.abs(acc.x) > 12 || Math.abs(acc.y) > 12 || Math.abs(acc.z) > 12) {
      if (energy <= 0 && !isTurbo) {
        setShowPopup('ENERGY_OUT');
        return;
      }

      const now = Date.now();
      if (now - lastShake.current > 150) {
        lastShake.current = now;
        setPoints((p) => p + currentMult);
        if (!isTurbo) setEnergy((en) => Math.max(0, en - 1));
        setShakeCount((c) => {
          if (c + 1 >= 20) {
            setShowPopup('AD_REWARD');
            return 0;
          }
          return c + 1;
        });
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
      }
    }
  };

  useEffect(() => {
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [energy, isTurbo, multLvl, tab, currentMult]);

  useEffect(() => {
    if (isTurbo && turboTime > 0) {
      const t = setTimeout(() => setTurboTime(turboTime - 1), 1000);
      return () => clearTimeout(t);
    }
    if (turboTime === 0) setIsTurbo(false);
  }, [isTurbo, turboTime]);

  const watchAd = (type) => {
    if (type === 'REFILL') {
      setEnergy(maxEnergy);
      setDailyRefills((d) => d - 1);
    } else if (type === 'TURBO') {
      setTurboMult(Math.floor(Math.random() * 10) + 1);
      setIsTurbo(true);
      setTurboTime(30);
    }
    setShowPopup(null);
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans select-none overflow-hidden">
      <div className="p-4 flex justify-between items-center bg-[#0d0d0d] border-b border-white/5">
        <div className="flex items-center gap-3" onClick={() => setShowPopup('LEAGUE')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-gray-700 to-gray-500 rounded-full border border-white/20 flex items-center justify-center text-xl"></div>
          <div>
            <p className="text-[10px] font-black opacity-40 uppercase tracking-tighter">@{userName}</p>
            <p className="text-[#CEFF00] text-[10px] font-black tracking-widest">{currentLeague.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('STORE')} className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-black italic"> BOOST</button>
        </div>
      </div>

      <div className="pt-8 text-center" onClick={() => setShowPopup('LEAGUE')}>
        <h1 className="text-5xl font-black italic tracking-tighter">{points.toLocaleString()}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#CEFF00]" style={{ width: `${(points / currentLeague.max) * 100}%` }} />
          </div>
          <span className="text-[8px] opacity-40 font-black">NEXT: {currentLeague.max.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 pt-4">
        {tab === 'MINE' && (
          <div className="h-full flex flex-col items-center justify-center">
            <motion.div
              animate={isTurbo ? { scale: [1, 1.1, 1], rotate: [0, 2, -2, 0] } : {}}
              transition={{ repeat: Infinity, duration: 0.3 }}
              className={`w-72 h-72 rounded-full border-8 flex flex-col items-center justify-center transition-all ${isTurbo ? 'border-orange-500 shadow-[0_0_80px_rgba(255,165,0,0.3)]' : 'border-[#CEFF00]/10 bg-white/5'}`}
            >
              <span className="text-[120px]">{isTurbo ? '' : '⚡'}</span>
              {isTurbo && <span className="font-black text-orange-500 animate-pulse">{turboMult}x ACTIVE</span>}
            </motion.div>
            <div className="w-full mt-12">
              <div className="flex justify-between text-xs font-black mb-1 px-1">
                <span className="text-blue-400">⚡ {energy} / {maxEnergy}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
                <motion.div animate={{ width: `${(energy / maxEnergy) * 100}%` }} className="h-full bg-gradient-to-r from-blue-600 to-[#CEFF00]" />
              </div>
            </div>
          </div>
        )}

        {tab === 'STORE' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black italic text-[#CEFF00]">UPGRADES</h2>
            <button
              disabled={points < multCost || multLvl >= 25}
              onClick={() => {
                setPoints((p) => p - multCost);
                setMultLvl((l) => l + 1);
              }}
              className="w-full bg-white/5 p-5 rounded-3xl border border-white/5 flex justify-between items-center disabled:opacity-30"
            >
              <div className="text-left"><p className="font-black">Multitap</p><p className="text-[10px] text-blue-400">Lvl {multLvl} (Max 25)</p></div>
              <p className="font-black">{multCost.toLocaleString()} J</p>
            </button>
            <button
              disabled={points < batCost}
              onClick={() => {
                setPoints((p) => p - batCost);
                setBatteryLvl((l) => l + 1);
              }}
              className="w-full bg-white/5 p-5 rounded-3xl border border-white/5 flex justify-between items-center disabled:opacity-30"
            >
              <div className="text-left"><p className="font-black">Energy Limit</p><p className="text-[10px] text-blue-400">Lvl {batteryLvl}</p></div>
              <p className="font-black">{batCost.toLocaleString()} J</p>
            </button>
          </div>
        )}

        {tab === 'EARN' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black italic text-[#CEFF00]">EARN JOLT</h2>
            {[
              { id: 'tg', title: 'Join Jolt News', reward: 50000 },
              { id: 'x', title: 'Follow Jolt X', reward: 25000 },
            ].map((task) => (
              <div key={task.id} className="bg-white/5 p-5 rounded-3xl border border-white/5 flex justify-between items-center">
                <p className="font-black">{task.title}</p>
                <button
                  disabled={tasksClaimed.includes(task.id)}
                  onClick={() => {
                    setPoints((p) => p + task.reward);
                    setTasksClaimed([...tasksClaimed, task.id]);
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black ${tasksClaimed.includes(task.id) ? 'bg-white/5 opacity-30' : 'bg-[#CEFF00] text-black'}`}
                >
                  {tasksClaimed.includes(task.id) ? 'CLAIMED' : `+${task.reward.toLocaleString()}`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <div className="bg-[#111] border border-white/10 w-full p-8 rounded-[40px] text-center">
              {showPopup === 'ENERGY_OUT' && (
                <>
                  <p className="text-5xl mb-4"></p>
                  <h2 className="text-2xl font-black mb-2 uppercase italic">Energy Empty!</h2>
                  <p className="text-xs opacity-50 mb-6 px-4">Wait for recharge or watch a quick ad to refill instantly.</p>
                  <button onClick={() => watchAd('REFILL')} className="w-full bg-[#CEFF00] text-black font-black py-4 rounded-2xl mb-3">WATCH AD (REFILL)</button>
                  <button onClick={() => setShowPopup(null)} className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs">CLOSE</button>
                </>
              )}
              {showPopup === 'AD_REWARD' && (
                <>
                  <p className="text-5xl mb-4"></p>
                  <h2 className="text-2xl font-black mb-2 uppercase italic">Turbo Lucky!</h2>
                  <p className="text-xs opacity-50 mb-6">You've hit 20 shakes! Watch an ad to get 1x-10x power for 30s.</p>
                  <button onClick={() => watchAd('TURBO')} className="w-full bg-orange-500 text-black font-black py-4 rounded-2xl mb-3">ACTIVATE LUCK</button>
                  <button onClick={() => setShowPopup(null)} className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs">SKIP</button>
                </>
              )}
              {showPopup === 'LEAGUE' && (
                <>
                  <h2 className="text-3xl font-black text-[#CEFF00] italic mb-1">{currentLeague.name}</h2>
                  <p className="text-[10px] opacity-40 font-black tracking-widest mb-6">RANKING STATUS</p>
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between bg-white/5 p-4 rounded-2xl text-xs"><span>Current Points</span><span className="text-[#CEFF00] font-black">{points.toLocaleString()}</span></div>
                    <div className="flex justify-between bg-white/5 p-4 rounded-2xl text-xs"><span>Next League</span><span>{currentLeague.max.toLocaleString()}</span></div>
                  </div>
                  <button onClick={() => setShowPopup(null)} className="w-full bg-[#CEFF00] text-black font-black py-4 rounded-2xl">BACK TO WORK</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 pb-8 bg-black">
        <nav className="h-20 bg-[#151515] rounded-3xl border border-white/10 flex items-center justify-around px-2">
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
