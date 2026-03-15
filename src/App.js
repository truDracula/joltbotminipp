import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [points, setPoints] = useState(() => Number(localStorage.getItem('jolt_points')) || 0);
  const [tab, setTab] = useState('MINE');
  const [energy, setEnergy] = useState(100);
  const [batteryLevel, setBatteryLevel] = useState(() => Number(localStorage.getItem('jolt_battery')) || 1);
  const [multLevel, setMultLevel] = useState(() => Number(localStorage.getItem('jolt_mult')) || 1);
  const [floatingPoints, setFloatingPoints] = useState([]);
  const [motionActive, setMotionActive] = useState(false);

  const lastShake = useRef(0);
  const tg = window.Telegram.WebApp;

  const maxEnergy = 100 + (batteryLevel - 1) * 500;
  const shakeValue = multLevel;

  const multUpgradeCost = Math.floor(2000 * Math.pow(2.5, multLevel - 1));
  const batteryUpgradeCost = Math.floor(1000 * Math.pow(2.2, batteryLevel - 1));

  useEffect(() => {
    localStorage.setItem('jolt_points', points);
    localStorage.setItem('jolt_battery', batteryLevel);
    localStorage.setItem('jolt_mult', multLevel);
  }, [points, batteryLevel, multLevel]);

  useEffect(() => {
    const timer = setInterval(() => {
      setEnergy((e) => Math.min(maxEnergy, e + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [maxEnergy]);

  const handleMotion = (event) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || energy < 1 || tab !== 'MINE') return;

    if (Math.abs(acc.x) > 12 || Math.abs(acc.y) > 12 || Math.abs(acc.z) > 12) {
      const now = Date.now();
      if (now - lastShake.current > 150) {
        lastShake.current = now;
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

        setPoints((p) => p + shakeValue);
        setEnergy((e) => Math.max(0, e - 1));

        const id = Date.now();
        setFloatingPoints((prev) => [...prev, { id, val: shakeValue }]);
        setTimeout(() => setFloatingPoints((p) => p.filter((f) => f.id !== id)), 800);
      }
    }
  };

  const startEngine = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const state = await DeviceMotionEvent.requestPermission();
      if (state === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
        setMotionActive(true);
      }
    } else {
      window.addEventListener('devicemotion', handleMotion);
      setMotionActive(true);
    }
  };

  const formatCost = (value) => (
    value > 1000000 ? `${(value / 1000000).toFixed(1)}M` : value.toLocaleString()
  );

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans select-none overflow-hidden">
      <AnimatePresence>
        {floatingPoints.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 1, y: 300 }}
            animate={{ opacity: 0, y: 150 }}
            className="absolute left-1/2 -translate-x-1/2 text-[#CEFF00] text-4xl font-black z-50 pointer-events-none"
          >
            +{f.val}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="p-8 text-center bg-gradient-to-b from-[#CEFF00]/10 to-transparent">
        <p className="text-[10px] text-[#CEFF00] font-black uppercase tracking-[0.3em] mb-2">Current Balance</p>
        <h1 className="text-5xl font-black italic tracking-tighter text-white">
          {points.toLocaleString()}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {tab === 'MINE' && (
          <div className="h-full flex flex-col items-center justify-center">
            <div
              onClick={startEngine}
              className={`relative w-72 h-72 rounded-full border-8 flex items-center justify-center transition-all duration-300 ${
                motionActive ? 'border-[#CEFF00] bg-white/5 shadow-[0_0_60px_rgba(206,255,0,0.1)]' : 'border-white/10 opacity-40'
              }`}
            >
              <span className="text-[120px]">{motionActive ? '⚡' : ''}</span>
            </div>

            <div className="w-full mt-16 space-y-3">
              <div className="flex justify-between text-xs font-black uppercase">
                <span className="text-blue-400">Battery Level {batteryLevel}</span>
                <span>{energy} / {maxEnergy}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  animate={{ width: `${(energy / maxEnergy) * 100}%` }}
                  className="h-full bg-gradient-to-r from-blue-600 to-[#CEFF00]"
                />
              </div>
              {!motionActive && <p className="text-center text-[10px] text-[#CEFF00] animate-pulse font-black mt-4">TAP TO ACTIVATE SENSORS</p>}
            </div>
          </div>
        )}

        {tab === 'STORE' && (
          <div className="pt-4 space-y-4">
            <h2 className="text-2xl font-black italic mb-6 text-[#CEFF00]">UPGRADES</h2>

            <button
              disabled={points < multUpgradeCost}
              onClick={() => {
                setPoints((p) => p - multUpgradeCost);
                setMultLevel((l) => l + 1);
              }}
              className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl flex justify-between items-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <div className="text-left">
                <p className="font-black text-lg text-white">Multitap</p>
                <p className="text-[10px] text-[#CEFF00] font-bold">Lvl {multLevel} • +1 per shake</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-black text-white">{formatCost(multUpgradeCost)}</span>
                <span className="text-[8px] text-white/30 font-black">JOLT</span>
              </div>
            </button>

            <button
              disabled={points < batteryUpgradeCost}
              onClick={() => {
                setPoints((p) => p - batteryUpgradeCost);
                setBatteryLevel((l) => l + 1);
              }}
              className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl flex justify-between items-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <div className="text-left">
                <p className="font-black text-lg text-white">Energy Limit</p>
                <p className="text-[10px] text-blue-400 font-bold">Lvl {batteryLevel} • +500 Cap</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-black text-white">{formatCost(batteryUpgradeCost)}</span>
                <span className="text-[8px] text-white/30 font-black">JOLT</span>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
        <nav className="h-20 bg-[#151515] rounded-3xl border border-white/10 flex items-center justify-around px-2">
          {['MINE', 'STORE', 'EARN', 'FRIENDS', 'TOP'].map((id) => (
            <button key={id} onClick={() => setTab(id)} className={`flex-1 flex flex-col items-center gap-1 ${tab === id ? 'text-[#CEFF00]' : 'text-white/20 grayscale opacity-50'}`}>
              <span className="text-xl">{id === 'MINE' ? '⚡' : id === 'STORE' ? '🛒' : id === 'EARN' ? '💸' : id === 'FRIENDS' ? '👥' : '🏆'}</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">{id}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
