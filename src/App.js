import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [points, setPoints] = useState(() => Number(localStorage.getItem('j_pts')) || 0);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('j_nrg')) || 100);
  const [batteryLvl, setBatteryLvl] = useState(() => Number(localStorage.getItem('j_bat')) || 1);
  const [multLvl, setMultLvl] = useState(() => Number(localStorage.getItem('j_mul')) || 1);
  const [claimedTasks, setClaimedTasks] = useState(() => JSON.parse(localStorage.getItem('j_tasks') || '[]'));
  const [tab, setTab] = useState('MINE');
  const [topTab, setTopTab] = useState('RANK');
  const [floatingPoints, setFloatingPoints] = useState([]);
  const [motionEnabled, setMotionEnabled] = useState(() => localStorage.getItem('j_motion') === '1');

  const [isShaking, setIsShaking] = useState(false);
  const [isAdActive, setIsAdActive] = useState(false);
  const [adTimer, setAdTimer] = useState(0);

  const lastShake = useRef(0);
  const shakeTimeout = useRef(null);
  const tg = window.Telegram.WebApp;
  const userName = tg.initDataUnsafe?.user?.username || 'Pilot';

  const maxEnergy = 100 + (batteryLvl - 1) * 500;
  const shakeVal = multLvl;
  const multCost = Math.floor(2000 * Math.pow(2.5, multLvl - 1));
  const batCost = Math.floor(1000 * Math.pow(2.2, batteryLvl - 1));
  const leagues = [
    { id: 'BRONZE', min: 0, max: 50000, color: 'text-orange-400' },
    { id: 'SILVER', min: 50000, max: 250000, color: 'text-slate-300' },
    { id: 'GOLD', min: 250000, max: 1000000, color: 'text-yellow-400' },
    { id: 'PLATINUM', min: 1000000, max: 5000000, color: 'text-cyan-300' },
    { id: 'DIAMOND', min: 5000000, max: Infinity, color: 'text-fuchsia-300' },
  ];
  const earnTasks = [
    {
      id: 'join_channel',
      title: 'Join Jolt Channel',
      reward: 5000,
      actionLabel: 'OPEN',
      run: () => tg.openTelegramLink?.('https://t.me/joltbotminipp'),
    },
    {
      id: 'open_bot',
      title: 'Open Jolt Bot',
      reward: 2500,
      actionLabel: 'OPEN',
      run: () => tg.openTelegramLink?.('https://t.me/joltbotminippbot'),
    },
    {
      id: 'daily_bonus',
      title: 'Daily Check-In',
      reward: 1000,
      actionLabel: 'CLAIM',
      run: () => {},
    },
  ];

  const formatCost = (value) => (
    value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value.toLocaleString()
  );
  const currentLeagueIndex = leagues.findIndex((league) => points >= league.min && points < league.max);
  const currentLeague = leagues[currentLeagueIndex === -1 ? leagues.length - 1 : currentLeagueIndex];
  const progressMax = Number.isFinite(currentLeague.max) ? currentLeague.max : currentLeague.min + 1000000;
  const leagueProgress = Math.max(0, Math.min(100, ((points - currentLeague.min) / Math.max(1, progressMax - currentLeague.min)) * 100));
  const leaderboard = [
    { name: 'voltking', score: 2850000 },
    { name: 'shakequeen', score: 1450000 },
    { name: 'coilgod', score: 820000 },
    { name: userName, score: points, isUser: true },
    { name: 'pulsepilot', score: 310000 },
    { name: 'gridrunner', score: 125000 },
    { name: 'sparkzero', score: 42000 },
  ].sort((a, b) => b.score - a.score);
  const userRank = leaderboard.findIndex((entry) => entry.isUser) + 1;

  const isTaskClaimed = (taskId) => claimedTasks.includes(taskId);

  const handleTask = (task) => {
    if (isTaskClaimed(task.id)) return;
    task.run();
    setPoints((prev) => prev + task.reward);
    setClaimedTasks((prev) => [...prev, task.id]);
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  };

  const handleMotion = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || energy <= 0 || tab !== 'MINE' || isAdActive || !motionEnabled) return;

    const totalAcc = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

    if (totalAcc > 18) {
      const now = Date.now();
      if (now - lastShake.current > 120) {
        lastShake.current = now;

        setIsShaking(true);
        clearTimeout(shakeTimeout.current);
        shakeTimeout.current = setTimeout(() => setIsShaking(false), 300);

        setPoints((p) => p + shakeVal);
        setEnergy((en) => Math.max(0, en - 1));
        const id = Date.now() + Math.random();
        setFloatingPoints((prev) => [...prev, { id, val: shakeVal }]);
        setTimeout(() => {
          setFloatingPoints((prev) => prev.filter((item) => item.id !== id));
        }, 800);
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
      }
    }
  };

  const startMotion = async () => {
    const motionEvent = window.DeviceMotionEvent;

    if (!motionEvent) {
      if (tg.showAlert) tg.showAlert('Motion sensors are not available on this device.');
      return;
    }

    if (typeof motionEvent.requestPermission === 'function') {
      try {
        const permission = await motionEvent.requestPermission();
        if (permission !== 'granted') {
          if (tg.showAlert) tg.showAlert('Motion permission was denied.');
          return;
        }
      } catch (error) {
        if (tg.showAlert) tg.showAlert('Motion permission request failed.');
        return;
      }
    }

    localStorage.setItem('j_motion', '1');
    setMotionEnabled(true);
  };

  useEffect(() => {
    if (!motionEnabled) return undefined;
    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      clearTimeout(shakeTimeout.current);
    };
  }, [energy, tab, isAdActive, shakeVal, motionEnabled]);

  useEffect(() => {
    localStorage.setItem('j_pts', points);
    localStorage.setItem('j_nrg', energy);
    localStorage.setItem('j_bat', batteryLvl);
    localStorage.setItem('j_mul', multLvl);
    localStorage.setItem('j_motion', motionEnabled ? '1' : '0');
    localStorage.setItem('j_tasks', JSON.stringify(claimedTasks));
    const timer = setInterval(() => setEnergy((e) => Math.min(maxEnergy, e + 1)), 4000);
    return () => clearInterval(timer);
  }, [points, energy, maxEnergy, motionEnabled, batteryLvl, multLvl, claimedTasks]);

  const triggerAd = () => {
    setIsAdActive(true);
    setAdTimer(10);
  };

  useEffect(() => {
    if (isAdActive && adTimer > 0) {
      const t = setTimeout(() => setAdTimer(adTimer - 1), 1000);
      return () => clearTimeout(t);
    }
    if (isAdActive && adTimer === 0) {
      setIsAdActive(false);
      setEnergy(maxEnergy);
    }
  }, [isAdActive, adTimer, maxEnergy]);

  const NavButton = ({ id, icon, label }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
        tab === id ? 'text-[#CEFF00] scale-110' : 'text-white/20'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black text-white font-sans overflow-hidden flex flex-col">
      <AnimatePresence>
        {floatingPoints.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -120, scale: 1.1 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 top-[42%] -translate-x-1/2 z-[300] text-[#CEFF00] text-4xl font-black pointer-events-none"
          >
            +{item.val}
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {isAdActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center p-10 text-center">
            <h2 className="text-[#CEFF00] text-3xl font-black italic mb-4">CHARGING VIA AD...</h2>
            <div className="w-full h-2 bg-white/10 rounded-full mb-4">
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 10 }} className="h-full bg-[#CEFF00]" />
            </div>
            <p className="text-4xl font-black">{adTimer}s</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 flex justify-between items-center bg-[#0a0a0a] border-b border-white/5 z-50">
        {tab !== 'MINE' ? (
          <button
            onClick={() => setTab('MINE')}
            className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2"
          >
            ← BACK
          </button>
        ) : (
          <div className="w-14" />
        )}
        <div className="text-right">
          <p className="text-[8px] font-black opacity-30 uppercase tracking-widest">Balance</p>
          <p className="text-xl font-black italic text-[#CEFF00]">{points.toLocaleString()}</p>
          <div className="mt-1 flex items-center justify-end gap-2 text-[8px] font-black uppercase tracking-[0.2em]">
            <span className={currentLeague.color}>{currentLeague.id}</span>
            <span className="opacity-30">#{userRank}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative pb-24 px-6">
        {tab === 'MINE' && (
          <div className="min-h-full flex flex-col items-center justify-center py-10">
            <div className="text-center mb-10">
              <h1 className="text-5xl font-black italic">{points.toLocaleString()}</h1>
            </div>

            <div className="relative">
              <motion.div
                animate={isShaking ? { scale: 1.1, rotate: [0, 2, -2, 0] } : { scale: 1 }}
                className={`w-72 h-72 rounded-full border-4 flex items-center justify-center transition-all duration-100
                ${isShaking ? 'border-[#CEFF00] bg-[#CEFF00]/5 shadow-[0_0_80px_rgba(206,255,0,0.2)]' : 'border-white/10 bg-white/5'}`}
              >
                <span className="text-[120px] select-none">{energy === 0 ? '' : '⚡'}</span>

                <AnimatePresence>
                  {isShaking && [1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 1], x: (Math.random() - 0.5) * 150, y: (Math.random() - 0.5) * 150 }}
                      className="absolute text-[#CEFF00] text-4xl font-black pointer-events-none"
                    >
                      ⚡
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>

            <div className="w-full mt-16 space-y-4">
              {!motionEnabled && (
                <button onClick={startMotion} className="w-full bg-[#CEFF00] text-black font-black py-3 rounded-2xl animate-pulse text-xs">
                  TAP TO ENABLE SHAKE
                </button>
              )}

              {energy === 0 && (
                <button onClick={triggerAd} className="w-full bg-red-600 text-white font-black py-3 rounded-2xl animate-pulse text-xs">
                  OUT OF ENERGY - WATCH AD TO REFILL
                </button>
              )}

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase opacity-50">
                  <span>Power Core</span>
                  <span>{energy} / {maxEnergy}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div animate={{ width: `${(energy / maxEnergy) * 100}%` }} className="h-full bg-[#CEFF00]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'STORE' && (
          <div className="pt-10 space-y-4">
            <h2 className="text-2xl font-black italic text-[#CEFF00]">PREMIUM SHOP</h2>
            <button
              disabled={points < multCost || multLvl >= 25}
              onClick={() => {
                setPoints((p) => p - multCost);
                setMultLvl((lvl) => lvl + 1);
              }}
              className="w-full bg-white/5 p-6 rounded-[32px] border border-white/10 flex justify-between items-center disabled:opacity-30"
            >
              <div className="text-left">
                <p className="font-black">MULTIPLIER</p>
                <p className="text-[10px] opacity-40">Level {multLvl} {multLvl >= 25 ? '(MAX)' : '• +1 per shake'}</p>
              </div>
              <div className="text-right">
                <p className="font-black">{multLvl >= 25 ? 'MAX' : `${formatCost(multCost)} J`}</p>
              </div>
            </button>
            <button
              disabled={points < batCost}
              onClick={() => {
                setPoints((p) => p - batCost);
                setBatteryLvl((lvl) => lvl + 1);
                setEnergy((current) => Math.min(current, 100 + batteryLvl * 500));
              }}
              className="w-full bg-white/5 p-6 rounded-[32px] border border-white/10 flex justify-between items-center disabled:opacity-30"
            >
              <div className="text-left">
                <p className="font-black">ENERGY LIMIT</p>
                <p className="text-[10px] opacity-40">Level {batteryLvl} • +500 cap</p>
              </div>
              <div className="text-right">
                <p className="font-black">{`${formatCost(batCost)} J`}</p>
              </div>
            </button>
            <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 flex justify-between items-center" onClick={() => tg.showAlert('TON Integration Required')}>
              <div><p className="font-black">DOUBLE YIELD</p><p className="text-[10px] opacity-40">2x points forever</p></div>
              <div className="bg-[#0098EA] px-4 py-2 rounded-xl font-black text-xs italic text-white">0.5 TON</div>
            </div>
            <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 flex justify-between items-center" onClick={() => tg.showAlert('Stars Integration Required')}>
              <div><p className="font-black">INSTANT REFILL</p><p className="text-[10px] opacity-40">Get 10,000 Energy</p></div>
              <div className="bg-yellow-500 px-4 py-2 rounded-xl font-black text-xs italic text-black">100 STAR</div>
            </div>
          </div>
        )}

        {tab === 'EARN' && (
          <div className="pt-10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black italic text-[#CEFF00]">TASK CENTER</h2>
              <span className="text-[10px] font-black uppercase opacity-40">
                {claimedTasks.length}/{earnTasks.length} done
              </span>
            </div>

            {earnTasks.map((task) => (
              <div key={task.id} className="bg-white/5 p-6 rounded-[32px] border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <p className="font-black">{task.title}</p>
                  <p className="text-[10px] text-[#CEFF00] font-black">+{formatCost(task.reward)} JOLT</p>
                </div>
                <button
                  disabled={isTaskClaimed(task.id)}
                  onClick={() => handleTask(task)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black ${
                    isTaskClaimed(task.id) ? 'bg-white/10 text-white/30' : 'bg-[#CEFF00] text-black'
                  }`}
                >
                  {isTaskClaimed(task.id) ? 'DONE' : task.actionLabel}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'TOP' && (
          <div className="pt-10 space-y-4">
            <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-2xl">
              {['RANK', 'LEAGUES'].map((panel) => (
                <button
                  key={panel}
                  onClick={() => setTopTab(panel)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${
                    topTab === panel ? 'bg-[#CEFF00] text-black shadow-lg' : 'text-white/40'
                  }`}
                >
                  {panel}
                </button>
              ))}
            </div>

            {topTab === 'RANK' && (
              <>
                <div className="bg-[#CEFF00]/10 border border-[#CEFF00]/20 rounded-[28px] p-5">
                  <p className="text-[10px] font-black uppercase opacity-50">Your Position</p>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-black italic text-[#CEFF00]">#{userRank}</p>
                      <p className="text-sm opacity-60">@{userName}</p>
                    </div>
                    <p className="text-lg font-black">{points.toLocaleString()}</p>
                  </div>
                </div>

                {leaderboard.map((entry, index) => (
                  <div
                    key={`${entry.name}-${index}`}
                    className={`bg-white/5 p-5 rounded-[28px] border flex items-center justify-between ${
                      entry.isUser ? 'border-[#CEFF00]/30' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black opacity-40 w-6">#{index + 1}</span>
                      <div>
                        <p className={`font-black ${entry.isUser ? 'text-[#CEFF00]' : 'text-white'}`}>
                          {entry.name}
                        </p>
                        <p className="text-[10px] uppercase opacity-40">
                          {leagues.find((league) => entry.score >= league.min && entry.score < league.max)?.id || 'DIAMOND'}
                        </p>
                      </div>
                    </div>
                    <p className="font-black">{entry.score.toLocaleString()}</p>
                  </div>
                ))}
              </>
            )}

            {topTab === 'LEAGUES' && (
              <>
                <div className="bg-white/5 border border-white/10 rounded-[28px] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-black opacity-40">Current League</p>
                      <p className={`text-2xl font-black italic ${currentLeague.color}`}>{currentLeague.id}</p>
                    </div>
                    <p className="text-[10px] uppercase font-black opacity-40">
                      {Number.isFinite(currentLeague.max) ? `${points.toLocaleString()} / ${currentLeague.max.toLocaleString()}` : 'Top Tier'}
                    </p>
                  </div>
                  <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${leagueProgress}%` }} className="h-full bg-[#CEFF00]" />
                  </div>
                </div>

                {leagues.map((league) => (
                  <div key={league.id} className={`bg-white/5 p-5 rounded-[28px] border ${league.id === currentLeague.id ? 'border-[#CEFF00]/30' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <p className={`font-black ${league.color}`}>{league.id}</p>
                      <p className="text-[10px] uppercase opacity-40">
                        {league.min.toLocaleString()} - {Number.isFinite(league.max) ? league.max.toLocaleString() : 'Infinity'}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'FRIENDS' && (
          <div className="pt-10 space-y-4">
            <h2 className="text-2xl font-black italic text-[#CEFF00]">FRIENDS</h2>
            <div className="bg-white/5 p-6 rounded-[32px] border border-white/10">
              <p className="font-black">Invite Friends</p>
              <p className="text-[10px] opacity-40 mt-2">Share your bot link and grow your rank together.</p>
            </div>
            <button
              onClick={() => tg.openTelegramLink?.('https://t.me/share/url?url=https://t.me/joltbotminippbot&text=Join%20Jolt%20with%20me')}
              className="w-full bg-[#CEFF00] text-black font-black py-4 rounded-2xl"
            >
              SEND INVITE
            </button>
          </div>
        )}
      </div>

      <div className="bg-black/80 backdrop-blur-md p-4 pb-8 border-t border-white/5 z-[100]">
        <nav className="h-20 bg-[#151515] rounded-[32px] border border-white/10 flex items-center justify-around px-2">
          <NavButton id="MINE" icon="⚡" label="Mine" />
          <NavButton id="STORE" icon="🛒" label="Store" />
          <NavButton id="EARN" icon="💸" label="Earn" />
          <NavButton id="TOP" icon="🏆" label="Top" />
          <NavButton id="FRIENDS" icon="👥" label="Friends" />
        </nav>
      </div>
    </div>
  );
}
