import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, updateDoc } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, Download, Settings, Users, ArrowLeft, Trash2, Plus, Lock, Database } from 'lucide-react';

/**
 * PRODUCTION FIREBASE CONFIG
 * Uses import.meta.env for Vercel/Vite, with a fallback for the preview environment.
 */
const getFirebaseConfig = () => {
  // Check if we are in a Vite environment (Vercel)
  const isVite = typeof import.meta !== 'undefined' && import.meta.env;
  
  if (isVite) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  }
  
  // Fallback for this preview environment
  return typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {};
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : "mwr-retreat-app";

const TRIBES = ['Faith', 'Hope', 'Love', 'Peace', 'Grace'];
const DEFAULT_DENOMINATIONS = [
  "Mountain of Fire and Miracles Ministries",
  "Redeemed Christian Church of God",
  "Christ Embassy",
  "Deeper Life Bible Church",
  "Other"
];

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('form'); 
  const [loading, setLoading] = useState(true);
  
  const [settings, setSettings] = useState({
    maxRegistrations: 500,
    isOpen: true,
    denominations: DEFAULT_DENOMINATIONS
  });
  const [registrations, setRegistrations] = useState([]);
  const [successData, setSuccessData] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    denomination: '',
    gender: 'Male',
    expectations: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setDoc(settingsRef, settings);
      }
    }, (err) => console.error("Settings error:", err));

    const regsRef = collection(db, 'artifacts', appId, 'public', 'data', 'registrations');
    const unsubRegs = onSnapshot(regsRef, (snapshot) => {
      const regs = [];
      snapshot.forEach(doc => regs.push({ id: doc.id, ...doc.data() }));
      setRegistrations(regs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }, (err) => console.error("Registrations error:", err));

    return () => {
      unsubSettings();
      unsubRegs();
    };
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!settings.isOpen) {
      setFormError("Registration is currently closed.");
      return;
    }
    if (registrations.length >= settings.maxRegistrations) {
      setFormError(`Capacity reached.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedTribe = TRIBES[Math.floor(Math.random() * TRIBES.length)];
      const countStr = String(registrations.length + 1).padStart(4, '0');
      const uniqueCode = `MWR-2026-${countStr}`;

      const payload = {
        ...formData,
        tribe: assignedTribe,
        code: uniqueCode,
        timestamp: new Date().toISOString(),
        userId: user.uid
      };

      const regsRef = collection(db, 'artifacts', appId, 'public', 'data', 'registrations');
      await addDoc(regsRef, payload);

      setSuccessData(payload);
      setView('success');
      setFormData({ fullName: '', email: '', denomination: '', gender: 'Male', expectations: '' });
    } catch (err) {
      setFormError("Connection error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const FormView = () => (
    <div className="max-w-2xl mx-auto pt-6 pb-20 px-4">
      <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5"><Database size={120} /></div>
        <div className="relative z-10">
          <p className="text-[10px] font-black tracking-[0.2em] text-emerald-600 uppercase mb-3">RETREAT THEME 2026</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">Ministers and Workers Retreat</h1>
          <p className="text-sm italic text-slate-600 mb-6 bg-emerald-50 p-4 rounded-lg border-l-4 border-emerald-500">
            "But they that wait upon the Lord shall renew their strength..." — Isaiah 40:31
          </p>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Objective</h4>
          <p className="text-sm text-slate-600 leading-relaxed">A sacred gathering for spiritual renewal and divine impartation.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-xl border border-emerald-100/50">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Registration</h2>
        <form onSubmit={handleRegister} className="space-y-6">
          <input type="text" name="fullName" required value={formData.fullName} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5" placeholder="Full Name" />
          <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5" placeholder="Email Address" />
          <div className="grid grid-cols-2 gap-4">
            <select name="denomination" required value={formData.denomination} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
              <option value="" disabled>Denomination</option>
              {settings.denominations.map(den => <option key={den} value={den}>{den}</option>)}
            </select>
            <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <textarea name="expectations" value={formData.expectations} onChange={handleInputChange} rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5" placeholder="Spiritual Expectations"></textarea>
          {formError && <div className="text-red-600 text-sm">{formError}</div>}
          <button type="submit" disabled={isSubmitting || !settings.isOpen} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg">
            {isSubmitting ? 'Processing...' : 'Register for Retreat'}
          </button>
        </form>
      </div>
    </div>
  );

  const SuccessView = () => (
    <div className="max-w-3xl mx-auto pt-10 px-4 text-center">
      <button onClick={() => setView('form')} className="text-slate-500 flex items-center text-sm mb-8"><ArrowLeft size={16} className="mr-2" /> Back</button>
      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100">
        <div className="bg-emerald-600 p-8 text-white">
          <CheckCircle2 size={48} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Confirmed</h2>
        </div>
        <div className="p-10 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl text-left"><p className="text-[10px] font-bold text-slate-400">NAME</p><p className="font-bold">{successData.fullName}</p></div>
            <div className="bg-slate-50 p-4 rounded-xl text-left"><p className="text-[10px] font-bold text-slate-400">CODE</p><p className="font-mono font-bold text-emerald-600">{successData.code}</p></div>
          </div>
          <div className="bg-emerald-50 p-6 rounded-xl"><p className="text-[10px] font-bold text-emerald-600">TRIBE</p><p className="text-3xl font-black">{successData.tribe}</p></div>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${successData.code}`} className="mx-auto border-4 border-white shadow-md rounded-lg" />
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-[#1E252B] text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3"><Database size={20}/><span className="font-bold tracking-tight">MWR 2026</span></div>
        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center"><div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>Connected</div>
      </nav>
      {view === 'form' && <FormView />}
      {view === 'success' && <SuccessView />}
      {view === 'admin_login' && (
        <div className="max-w-md mx-auto pt-20 p-4">
          <div className="bg-white p-10 rounded-3xl shadow-xl">
            <Lock className="mx-auto mb-4 text-slate-300" />
            <input type="password" onKeyDown={(e) => e.key === 'Enter' && e.target.value === 'admin123' && setView('admin_dashboard')} className="w-full border p-4 rounded-xl text-center" placeholder="Admin PIN" />
            <button onClick={() => setView('form')} className="w-full mt-4 text-slate-400 text-xs">Back</button>
          </div>
        </div>
      )}
      {view === 'admin_dashboard' && (
        <div className="p-8 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
             <h1 className="text-2xl font-bold">Admin Console</h1>
             <button onClick={() => setView('form')} className="bg-slate-200 px-4 py-2 rounded-lg font-bold text-sm">Exit</button>
          </div>
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                <tr><th className="p-4">Name</th><th className="p-4">Code</th><th className="p-4">Tribe</th><th className="p-4">Date</th></tr>
              </thead>
              <tbody className="divide-y">
                {registrations.map(r => (
                  <tr key={r.id} className="text-sm">
                    <td className="p-4 font-medium">{r.fullName}</td>
                    <td className="p-4 font-mono">{r.code}</td>
                    <td className="p-4 font-bold text-emerald-600">{r.tribe}</td>
                    <td className="p-4 text-slate-400">{new Date(r.timestamp).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {view === 'form' && <button onClick={() => setView('admin_login')} className="fixed bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-300 uppercase tracking-widest">Admin Access</button>}
    </div>
  );
}
