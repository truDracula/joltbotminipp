import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [points, setPoints] = useState(() => Number(localStorage.getItem('j_pts')) || 0);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('j_nrg')) || 100);
  const [batteryLvl, setBatteryLvl] = useState(() => Number(localStorage.getItem('j_bat')) || 1);
  const [multLvl, setMultLvl] = useState(() => Number(localStorage.getItem('j_mul')) || 1);
  const [tab, setTab] = useState('MINE');

  const [isTurbo, setIsTurbo] = useState(false);
  const [turboTime, setTurboTime] = useState(0);
  const [dailyFullTanks, setDailyFullTanks] = useState(3);
  const [dailyTurbo, setDailyTurbo] = useState(3);

  const lastShake = useRef(0);
  const tg = window.Telegram.WebApp;
  const userId = tg.initDataUnsafe?.user?.id || '668291';
  const userName = tg.initDataUnsafe?.user?.username || 'Operator';

  const maxEnergy = 100 + (batteryLvl - 1) * 500;
  const shakeVal = isTurbo ? multLvl * 5 : multLvl;
  const multCost = Math.floor(2000 * Math.pow(2.5, multLvl - 1));
  const batCost = Math.floor(1000 * Math.pow(2.2, batteryLvl - 1));

  const leagues = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
  const currentLeague = points < 50000 ? 0 : points < 250000 ? 1 : points < 1000000 ? 2 : points < 5000000 ? 3 : 4;

  useEffect(() => {
    localStorage.setItem('j_pts', points);
    localStorage.setItem('j_bat', batteryLvl);
    localStorage.setItem('j_mul', multLvl);
    localStorage.setItem('j_nrg', energy);
  }, [points, batteryLvl, multLvl, energy]);

  useEffect(() => {
    const timer = setInterval(() => setEnergy((e) => Math.min(maxEnergy, e + 1)), 5000);
    return () => clearInterval(timer);
  }, [maxEnergy]);

  const handleMotion = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || (energy < 1 && !isTurbo) || tab !== 'MINE') return;
    if (Math.abs(acc.x) > 12 || Math.abs(acc.y) > 12 || Math.abs(acc.z) > 12) {
      const now = Date.now();
      if (now - lastShake.current > 150) {
        lastShake.current = now;
        setPoints((p) => p + shakeVal);
        if (!isTurbo) setEnergy((en) => Math.max(0, en - 1));
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred(isTurbo ? 'heavy' : 'light');
      }
    }
  };

  useEffect(() => {
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [energy, isTurbo, multLvl, tab]);

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans select-none overflow-hidden">
      <div className="p-4 flex justify-between items-center bg-[#0d0d0d] border-b border-white/5">
        <div className="flex items-center gap-3" onClick={() => setTab('PROFILE')}>
          <div className="w-10 h-10 bg-[#CEFF00] rounded-full flex items-center justify-center text-black font-black text-xs">ID</div>
          <div>
            <p className="text-[10px] font-black opacity-50 uppercase tracking-tighter">@{userName}</p>
            <p className="text-[#CEFF00] text-[10px] font-black">{leagues[currentLeague]} LEAGUE</p>
          </div>
        </div>
        <button onClick={() => setTab('STORE')} className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
          <span className="text-xs font-black"> BOOST</span>
        </button>
      </div>

      <div className="pt-8 text-center">
        <h1 className="text-5xl font-black italic tracking-tighter">
          {points.toLocaleString()}
        </h1>
        <p className="text-[10px] opacity-40 font-black tracking-[0.5em] mt-2 italic">JOLT TOKENS</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {tab === 'MINE' && (
          <div className="h-full flex flex-col items-center justify-center">
            <motion.div
              animate={isTurbo ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className={`w-72 h-72 rounded-full border-8 flex flex-col items-center justify-center transition-all duration-300
              ${isTurbo ? 'border-orange-500 shadow-[0_0_80px_rgba(255,165,0,0.4)] bg-black' : 'border-[#CEFF00]/10 bg-white/5'}`}
            >
              <span className="text-[120px]">{isTurbo ? '' : '⚡'}</span>
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
          <div className="pt-4 space-y-6">
            <h2 className="text-xl font-black italic text-[#CEFF00] tracking-widest">DAILY BOOSTERS</h2>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { if (dailyTurbo > 0) { setIsTurbo(true); setTurboTime(15); setDailyTurbo((d) => d - 1); setTab('MINE'); } }} className="bg-white/5 p-4 rounded-3xl border border-white/5 text-left">
                <p className="text-2xl"></p><p className="font-black text-xs">TURBO</p><p className="text-[9px] opacity-40">{dailyTurbo}/3 left</p>
              </button>
              <button onClick={() => { if (dailyFullTanks > 0) { setEnergy(maxEnergy); setDailyFullTanks((d) => d - 1); setTab('MINE'); } }} className="bg-white/5 p-4 rounded-3xl border border-white/5 text-left">
                <p className="text-2xl"></p><p className="font-black text-xs">REFILL</p><p className="text-[9px] opacity-40">{dailyFullTanks}/3 left</p>
              </button>
            </div>
            <h2 className="text-xl font-black italic text-[#CEFF00] tracking-widest pt-4">UPGRADES</h2>
            <button disabled={points < multCost || multLvl >= 25} onClick={() => { setPoints((p) => p - multCost); setMultLvl((l) => l + 1); }}
              className="w-full bg-white/5 p-5 rounded-3xl border border-white/5 flex justify-between items-center disabled:opacity-30">
              <div className="text-left"><p className="font-black">Multitap</p><p className="text-[10px] text-blue-400">Lvl {multLvl} / 25</p></div>
              <p className="font-black">{multLvl >= 25 ? 'MAX' : `${multCost.toLocaleString()} J`}</p>
            </button>
            <button disabled={points < batCost} onClick={() => { setPoints((p) => p - batCost); setBatteryLvl((l) => l + 1); }}
              className="w-full bg-white/5 p-5 rounded-3xl border border-white/5 flex justify-between items-center disabled:opacity-30">
              <div className="text-left"><p className="font-black">Energy Limit</p><p className="text-[10px] text-blue-400">Lvl {batteryLvl}</p></div>
              <p className="font-black">{`${batCost.toLocaleString()} J`}</p>
            </button>
          </div>
        )}

        {tab === 'FRIENDS' && (
          <div className="pt-8 text-center">
            <h2 className="text-3xl font-black italic mb-4">REFERRALS</h2>
            <div className="bg-white/5 p-8 rounded-[40px] border border-white/5 mb-8">
              <p className="text-sm opacity-60">Invite friends and receive <span className="text-[#CEFF00] font-black">10%</span> of their Jolt yields!</p>
            </div>
            <button onClick={() => tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/jolt_bot/play?start=${userId}&text=Earn Jolt with me!`)}
              className="w-full bg-[#CEFF00] text-black font-black py-4 rounded-2xl shadow-[0_0_30px_rgba(206,255,0,0.2)]">
              INVITE FRIEND
            </button>
          </div>
        )}

        {tab === 'PROFILE' && (
          <div className="pt-8">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
              <h3 className="text-xs font-black opacity-30 uppercase mb-4">User Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/5 pb-2"><span>Username</span><span className="text-[#CEFF00]">@{userName}</span></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span>User ID</span><span className="opacity-40">{userId}</span></div>
                <div className="flex justify-between border-b border-white/5 pb-2"><span>Total Multiplier</span><span>{shakeVal}x</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pb-8 bg-black/90 backdrop-blur-md">
        <nav className="h-20 bg-[#151515] rounded-3xl border border-white/10 flex items-center justify-around px-2">
          {['MINE', 'STORE', 'EARN', 'FRIENDS'].map((id) => (
            <button key={id} onClick={() => setTab(id)} className={`flex-1 flex flex-col items-center gap-1 transition-all ${tab === id ? 'text-[#CEFF00] scale-110' : 'text-white/20'}`}>
              <span className="text-xl">{id === 'MINE' ? '⚡' : id === 'STORE' ? '🛒' : id === 'EARN' ? '💸' : '👥'}</span>
              <span className="text-[8px] font-black uppercase">{id}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
