import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { id: 'EXCHANGE', label: 'Exchange', icon: '⚡' },
  { id: 'MINE', label: 'Mine', icon: '⛏️' },
  { id: 'FRIENDS', label: 'Friends', icon: '' },
  { id: 'EARN', label: 'Earn', icon: '' },
  { id: 'AIRDROP', label: 'Airdrop', icon: '' },
];

export default function App() {
  const [tab, setTab] = useState('EXCHANGE');
  const [points, setPoints] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [kinetic, setKinetic] = useState(0);
  const [floatingPoints, setFloatingPoints] = useState([]);

  const [isRolling, setIsRolling] = useState(false);
  const [isHyper, setIsHyper] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);

  const lastShakeTime = useRef(Date.now());

  const handleAction = (e) => {
    if (energy < 1 || isRolling || tab !== 'EXCHANGE') return;
    lastShakeTime.current = Date.now();

    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);

    const id = Date.now();
    const val = isHyper ? multiplier : 1;
    setFloatingPoints((prev) => [...prev, { id, x, y: y - 50, val }]);
    setTimeout(() => setFloatingPoints((prev) => prev.filter((p) => p.id !== id)), 800);

    if (isHyper) {
      setPoints((p) => p + multiplier);
    } else {
      setEnergy((prev) => Math.max(0, prev - 0.5));
      setPoints((p) => p + 1);
      setKinetic((prev) => {
        const next = prev + 4;
        if (next >= 100) {
          triggerSlot();
          return 100;
        }
        return next;
      });
    }
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const triggerSlot = () => {
    setIsRolling(true);
    const interval = setInterval(() => {
      setMultiplier([2, 5, 10, 15][Math.floor(Math.random() * 4)]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setIsRolling(false);
      setIsHyper(true);
      setTimeLeft(12);
    }, 2000);
  };

  useEffect(() => {
    if (window.Telegram?.WebApp?.disableVerticalSwipes) {
      window.Telegram.WebApp.disableVerticalSwipes();
    }
  }, []);

  useEffect(() => {
    if (isHyper && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(t);
    } else if (timeLeft === 0 && isHyper) {
      setIsHyper(false);
      setKinetic(0);
    }
  }, [isHyper, timeLeft]);

  return (
    <div className="fixed inset-0 bg-[#000] flex flex-col items-center overflow-hidden">
      <AnimatePresence>
        {floatingPoints.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, y: p.y }}
            animate={{ opacity: 0, y: p.y - 150 }}
            className="absolute z-50 text-3xl font-black text-[#CEFF00]"
            style={{ left: p.x }}
          >
            +{p.val}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="w-full p-6 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Balance</span>
          <span className="text-4xl font-black text-[#CEFF00]">{points.toLocaleString()}</span>
        </div>
        <div className="bg-white/5 border border-white/10 px-4 py-1 rounded-full text-[10px] font-bold">CEO</div>
      </div>

      <main className="flex-1 w-full flex flex-col items-center justify-center relative touch-none" onPointerDown={handleAction}>
        {(kinetic > 0 || isHyper) && (
          <motion.div
            animate={{ scale: isHyper ? [1, 1.3, 1] : 1 + (kinetic / 200), opacity: [0.1, 0.2, 0.1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`absolute w-80 h-80 blur-3xl rounded-full ${isHyper ? 'bg-[#CEFF00]' : 'bg-blue-600'}`}
          />
        )}

        <motion.div whileTap={{ scale: 0.95 }} className="relative z-10">
          <div className="w-64 h-64 bg-[#111] rounded-full border-[8px] border-white/5 flex items-center justify-center shadow-2xl overflow-hidden">
            <span className="text-8xl">⚡</span>
          </div>

          <AnimatePresence>
            {isRolling && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-full flex flex-col items-center justify-center border-4 border-[#CEFF00]"
              >
                <span className="text-xs font-black text-[#CEFF00] mb-2 tracking-[0.3em]">CALIBRATING</span>
                <span className="text-6xl font-black italic">{multiplier}X</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {isHyper && (
          <div className="mt-8 bg-[#CEFF00] px-6 py-2 rounded-xl text-black font-black italic shadow-[0_0_20px_#CEFF00]">
            POWER: {timeLeft}s
          </div>
        )}

        {kinetic === 0 && !isHyper && (
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="mt-10 opacity-30 flex flex-col items-center">
            <span className="text-5xl"></span>
            <span className="text-[10px] font-black uppercase mt-2">Shake to Start</span>
          </motion.div>
        )}
      </main>

      <div className="w-full px-8 mb-6">
        <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
          <span className="text-blue-400">Energy</span>
          <span>{Math.floor(energy)}/100</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div animate={{ width: `${energy}%` }} className={`h-full ${isHyper ? 'bg-[#CEFF00]' : 'bg-blue-600'}`} />
        </div>
      </div>

      <div className="w-full px-4 pb-8">
        <nav className="h-20 bg-[#1c1c1e] rounded-2xl border border-white/10 flex items-center justify-around relative overflow-hidden">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center flex-1 z-10 gap-1 ${tab === item.id ? 'text-[#CEFF00]' : 'text-gray-500'}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[9px] font-bold uppercase">{item.label}</span>
            </button>
          ))}
          <motion.div className="absolute h-14 bg-white/5 rounded-xl" style={{ width: '18%' }} animate={{ x: `${NAV_ITEMS.findIndex((i) => i.id === tab) * 100}%` }} />
        </nav>
      </div>
    </div>
  );
}
