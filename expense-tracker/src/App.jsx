import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  PlusCircle, 
  History, 
  Settings, 
  CreditCard, 
  Tag, 
  DollarSign, 
  Trash2, 
  LogOut, 
  Sheet, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Brain,
  Wand2,
  X,
  Camera,
  Flame,
  BarChart3,
  PieChart,
  TrendingUp,
  PiggyBank,
  MessageSquare,
  Send,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  Briefcase,
  Clock,
  Mic,
  Calculator,
  ShoppingBag,
  User,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Wallet,
  Repeat,
  Gift,
  Bot,
  GraduationCap,
  FileText,
  ChevronRight
} from 'lucide-react';

// ==========================================
// 1. CONFIGURATION 
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyByzwSPuEMzDrNSYZbu2P9JlWNKsvu0CKk",
  authDomain: "expense-tracker-bcb4d.firebaseapp.com",
  projectId: "expense-tracker-bcb4d",
  storageBucket: "expense-tracker-bcb4d.firebasestorage.app",
  messagingSenderId: "1045697315970",
  appId: "1:1045697315970:web:29ba71d56cd929facee09b"
};

// ==========================================
// 2. INITIALIZATION
// ==========================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);      
const db = getFirestore(app);   
const appId = "my-expense-tracker"; 

// Default Gemini Key (Fixed variable name)
const apiKey = ""; 

// --- Components ---

const SetupGuide = () => (
  <div className="space-y-4 text-sm text-zinc-400 animate-in fade-in duration-500">
    <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800">
      <h3 className="font-bold text-purple-300 flex items-center gap-2">
        <Sparkles size={18} /> Gemini AI Features
      </h3>
      <p className="mt-2 text-zinc-400">This app uses AI to simplify your finances:</p>
      <ul className="list-disc list-inside mt-2 ml-1 space-y-1 text-zinc-500">
        <li><strong>Magic Fill:</strong> Auto-fill forms from text.</li>
        <li><strong>Receipt Scan:</strong> Data from photos.</li>
        <li><strong>Advisor:</strong> Spending advice & forecasts.</li>
      </ul>
    </div>
    <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800">
      <h3 className="font-bold text-blue-300 flex items-center gap-2">
        <Sheet size={18} /> Google Sheets Sync
      </h3>
      <ol className="list-decimal list-inside mt-2 space-y-1 ml-1 text-zinc-500">
        <li>Create Sheet {'>'} Extensions {'>'} Apps Script.</li>
        <li>Paste code below {'>'} Deploy as Web App.</li>
        <li>Access: <strong>Anyone</strong> {'>'} Copy URL below.</li>
      </ol>
    </div>
    <div className="bg-black/40 text-zinc-400 p-4 rounded-3xl font-mono text-[10px] overflow-x-auto border border-zinc-800">
      <pre>{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  if (sheet.getLastRow() === 0) sheet.appendRow(["Date", "Type", "Category", "Item", "Amount", "Notes"]);
  sheet.appendRow([data.date, data.type, data.category, data.item, data.amount, data.notes]);
  return ContentService.createTextOutput(JSON.stringify({"status":"success"}));
}`}</pre>
    </div>
  </div>
);

const Card = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-zinc-900 rounded-[28px] p-5 shadow-sm border border-zinc-800/50 transition-all duration-300 hover:bg-zinc-800/80 ${className}`}
  >
    {children}
  </div>
);

const CategoryBadge = ({ category, type }) => {
  if (type === 'income') {
    return (
      <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-800/50 uppercase tracking-wider">
        {category || 'Income'}
      </span>
    );
  }
  
  const colors = {
    Food: 'bg-orange-900/30 text-orange-300 border-orange-800/50',
    Transport: 'bg-blue-900/30 text-blue-300 border-blue-800/50',
    Utilities: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50',
    Entertainment: 'bg-purple-900/30 text-purple-300 border-purple-800/50',
    Shopping: 'bg-pink-900/30 text-pink-300 border-pink-800/50',
    Health: 'bg-teal-900/30 text-teal-300 border-teal-800/50',
    Other: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
  const style = colors[category] || colors.Other;
  return (
    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider ${style}`}>
      {category}
    </span>
  );
};

export default function ExpenseTracker() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('add');
  const [expenses, setExpenses] = useState([]);
  const [scriptUrl, setScriptUrl] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  
  // Form State
  const [entryType, setEntryType] = useState('expense'); 
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [item, setItem] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // AI States
  const [showSmartAdd, setShowSmartAdd] = useState(false);
  const [smartInput, setSmartInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisType, setAnalysisType] = useState('helpful');
  const [isListening, setIsListening] = useState(false);
  
  // AI Feature States
  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorResult, setAdvisorResult] = useState(null);
  const [personaResult, setPersonaResult] = useState(null);
  const [subscriptions, setSubscriptions] = useState(null);
  const [opportunityResult, setOpportunityResult] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [taxDeductions, setTaxDeductions] = useState(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: "Hey! I'm your finance buddy. Ask me anything about your spending!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Visualization
  const [chartPeriod, setChartPeriod] = useState(7); 
  const [focusedBar, setFocusedBar] = useState(null);
  const [focusedCategory, setFocusedCategory] = useState(null);
  const [searchDate, setSearchDate] = useState('');

  // --- Auth & Data Loading ---
  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (err) { console.error(err); }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    getDoc(settingsRef).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setScriptUrl(data.scriptUrl || '');
        setGeminiKey(data.geminiKey || '');
        if (data.persona) setPersonaResult(data.persona);
      }
    });
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'expenses');
    return onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(loaded);
    });
  }, [user]);

  useEffect(() => {
    if (activeTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  // --- AI Functions ---
  const callGemini = async (prompt, imageBase64 = null) => {
    // Check both user setting and environment variable
    const keyToUse = geminiKey || apiKey;
    if (!keyToUse) throw new Error("Please add your Gemini API Key in the Settings tab to use AI features.");
    
    const parts = [{ text: prompt }];
    if (imageBase64) parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] } });
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${keyToUse}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }] })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  };

  // FIX: More robust JSON parsing that finds the first '{' and last '}'
  const parseGeminiJson = (text) => {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      throw new Error("Failed to parse AI response. Please try again.");
    }
  };
  
  const parseGeminiJsonArray = (text) => {
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      throw new Error("Failed to parse AI response. Please try again.");
    }
  };

  const handleSmartAdd = async () => {
    if (!smartInput.trim()) return;
    setIsProcessingAI(true);
    try {
      // Stronger prompt for correct categorization
      const res = await callGemini(`
        You are a financial data extractor. Extract expense details from this text: "${smartInput}".
        
        Return ONLY a valid JSON object with no markdown formatting.
        Required keys: 
        - item (string: short description)
        - amount (number: value only, no currency symbols)
        - category (string: MUST be one of [Food, Transport, Utilities, Entertainment, Shopping, Health, Other])
        - notes (string: any extra details)
        - type (string: "expense" or "income")

        Rules:
        - If text implies earning money (Salary, Freelance, Sold item), type is "income".
        - If text implies spending (Bought, Paid, etc.), type is "expense".
        - Default to "expense" if unclear.
      `);
      
      const data = parseGeminiJson(res);
      
      if (data.amount) setAmount(data.amount.toString());
      if (data.item) setItem(data.item);
      if (data.category) setCategory(data.category);
      if (data.notes) setNotes(data.notes);
      if (data.type) setEntryType(data.type.toLowerCase());
      
      setShowSmartAdd(false);
      setSmartInput('');
      showNotification("✨ Magic Fill applied!");
    } catch (err) { 
      console.error(err);
      showNotification(err.message, "error"); 
    } finally { 
      setIsProcessingAI(false); 
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) return alert("Voice not supported");
    const recognition = new window.webkitSpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => setSmartInput(e.results[0][0].transcript);
    recognition.start();
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessingAI(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await callGemini(`Extract from receipt: Total Amount, Vendor/Item, Date (YYYY-MM-DD), Category. Return JSON.`, reader.result);
        const data = parseGeminiJson(res);
        setAmount(data.amount?.toString()); setItem(data.item); setCategory(data.category); if(data.date) setDate(data.date); setEntryType('expense');
        setShowSmartAdd(false); showNotification("Receipt scanned!");
      } catch (err) { showNotification("Scan failed", "error"); } finally { setIsProcessingAI(false); }
    };
    reader.readAsDataURL(file);
  };

  // --- AI Handlers ---
  const handleAIAction = async (action, promptSuffix = "") => {
    setIsProcessingAI(true);
    const list = expenses.filter(e => e.type !== 'income');
    const recent = list.slice(0, 50).map(e => `${e.date}: $${e.amount} (${e.item})`).join('\n');
    try {
      const res = await callGemini(`${promptSuffix} Data: ${recent}`);
      if (action === 'persona') {
        const json = parseGeminiJson(res);
        setPersonaResult(json);
        if(user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), { persona: json }, { merge: true });
      } else if (action === 'analyze') {
        setAnalysisResult(res);
      } else if (action === 'subscriptions') {
        setSubscriptions(parseGeminiJsonArray(res));
      } else if (action === 'report') {
        setReportCard(parseGeminiJson(res));
      } else if (action === 'tax') {
        setTaxDeductions(parseGeminiJsonArray(res));
      } else if (action === 'opportunity') {
        setOpportunityResult(parseGeminiJson(res));
      } else if (action === 'advice') {
        setAdvisorResult(parseGeminiJson(res));
      }
    } catch (e) { showNotification("AI Error", "error"); } finally { setIsProcessingAI(false); }
  };

  const handleAnalyze = async (type = 'helpful') => {
    setIsProcessingAI(true);
    setAnalysisType(type);
    const expenseList = expenses.filter(e => e.type !== 'income');
    const recent = expenseList.slice(0, 20).map(e => `${e.date}: ${e.item} ($${e.amount}, ${e.category})`).join('\n');
    let prompt = "";
    if (type === 'roast') prompt = `Roast my spending habits based on these expenses. Be funny and sarcastic. Expenses:\n${recent}`;
    else if (type === 'savings') prompt = `Identify 3 specific ways to save money based on these expenses. Bullet points. Expenses:\n${recent}`;
    else if (type === 'forecast') prompt = `Predict my spending trend for the rest of the month based on these expenses. Keep it brief. Expenses:\n${recent}`;
    else prompt = `Give me a 3-sentence summary of these expenses with helpful advice. Expenses:\n${recent}`;
    
    try {
      const result = await callGemini(prompt);
      setAnalysisResult(result);
    } catch (err) {
      showNotification("Analysis failed: " + err.message, "error");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput; setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsChatLoading(true);
    const context = expenses.map(e => `${e.date}: ${e.type==='income'?'+':'-'}$${e.amount} (${e.item})`).join('\n');
    try {
      const res = await callGemini(`You are a chill finance buddy. Answer brief & friendly. Data:\n${context}\n\nQ: "${msg}"`);
      setChatMessages(prev => [...prev, { role: 'ai', text: res }]);
    } catch (e) { setChatMessages(prev => [...prev, { role: 'ai', text: "Brain freeze... try again?" }]); } finally { setIsChatLoading(false); }
  };

  const handlePurchaseAdvice = async () => {
    if (!advisorInput.trim()) return;
    setIsProcessingAI(true);
    const expenseList = expenses.filter(e => e.type !== 'income');
    const recent = expenseList.slice(0, 50).map(e => `${e.date}: $${e.amount} on ${e.category}`).join('\n');
    const totalExpense = expenseList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalIncome = expenses.filter(e => e.type === 'income').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const balance = totalIncome - totalExpense;

    const prompt = `I want to buy: "${advisorInput}". My income $${totalIncome}, expenses $${totalExpense}, balance $${balance}. Expenses: ${recent}. Analyze if I can afford this. Give me a verdict JSON: { "verdict": "YES/NO/MAYBE", "reason": "Short witty explanation" }`;
    try {
      const text = await callGemini(prompt);
      const res = parseGeminiJson(text);
      setAdvisorResult(res);
    } catch (err) {
      showNotification("Advice failed: " + err.message, "error");
    } finally {
      setIsProcessingAI(false);
    }
  };

  // --- Data Management ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), {
        type: entryType, date, category: entryType === 'income' ? 'Income' : category, item, amount: parseFloat(amount), notes, createdAt: serverTimestamp()
      });
      if (scriptUrl) await fetch(scriptUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, type: entryType, category, item, amount, notes }) });
      setAmount(''); setItem(''); setNotes(''); showNotification("Saved!");
    } catch (e) { showNotification("Error", "error"); } finally { setIsSubmitting(false); }
  };

  const showNotification = (msg, type = 'success') => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000); };
  const handleDelete = async (id) => { if(confirm("Delete?")) deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', id)); };
  const handleSaveSettings = async () => { if(user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), { scriptUrl, geminiKey }, { merge: true }); showNotification("Settings Saved"); };

  // --- Logic & Visuals ---
  const totalIncome = useMemo(() => expenses.filter(e => e.type === 'income').reduce((a, c) => a + (Number(c.amount)||0), 0), [expenses]);
  const totalExpenses = useMemo(() => expenses.filter(e => e.type !== 'income').reduce((a, c) => a + (Number(c.amount)||0), 0), [expenses]);
  const balance = totalIncome - totalExpenses;
  
  const filteredExpenses = useMemo(() => searchDate ? expenses.filter(e => e.date === searchDate) : expenses, [expenses, searchDate]);
  
  const monthStats = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();
    let workingDaysLeft = 0;
    for (let i = now.getDate() + 1; i <= daysInMonth; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), i).getDay();
      if (day !== 5 && day !== 6) workingDaysLeft++;
    }
    return { daysLeft, workingDaysLeft, daysInMonth };
  }, []);

  const chartData = useMemo(() => {
    const days = Array.from({length: chartPeriod}, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (chartPeriod - 1 - i));
      return { date: d.toISOString().split('T')[0], day: d.toLocaleDateString('en-US', { weekday: 'narrow' }), amount: 0 };
    });
    expenses.filter(e => e.type !== 'income').forEach(e => {
      const d = days.find(day => day.date === e.date);
      if (d) d.amount += parseFloat(e.amount);
    });
    const max = Math.max(...days.map(d => d.amount), 1);
    return days.map(d => ({ ...d, percent: (d.amount / max) * 100 }));
  }, [expenses, chartPeriod]);

  const categoryData = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - chartPeriod);
    const totals = {};
    expenses.filter(e => e.type !== 'income' && new Date(e.date) >= cutoff).forEach(e => totals[e.category] = (totals[e.category] || 0) + parseFloat(e.amount));
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals).map(([k, v]) => ({ name: k, value: v, percent: total ? (v / total) * 100 : 0 })).sort((a, b) => b.value - a.value);
  }, [expenses, chartPeriod]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-500"><Loader2 className="animate-spin w-8 h-8 text-purple-500" /></div>;

  const getAIBoxColor = () => {
    switch(analysisType) {
      case 'roast': return 'bg-gradient-to-r from-orange-500 to-red-600 border-orange-500/50';
      case 'savings': return 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-200';
      case 'forecast': return 'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-500/50';
      default: return 'bg-gradient-to-r from-purple-500 to-indigo-600 border-purple-500/50';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-32 selection:bg-purple-500/30">
      
      {/* --- Header --- */}
      <header className="pt-8 pb-6 px-6 sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto flex justify-between items-end">
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Balance</p>
            <h1 className={`text-4xl font-black tracking-tight ${balance < 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
          </div>
          <div className="bg-zinc-900 p-2 rounded-2xl border border-zinc-800">
            <User className="text-zinc-400" size={24} />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 relative z-10 space-y-8">
        
        {/* Notification Toast - FIXED POSITION */}
        {notification && (
          <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom-5 fade-in duration-300 ${notification.type === 'error' ? 'bg-red-500/90 text-white border border-red-400/50' : 'bg-emerald-500/90 text-white border border-emerald-400/50'} backdrop-blur-md w-max`}>
            {notification.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle size={16}/>} {notification.msg}
          </div>
        )}

        {/* --- TAB: ADD --- */}
        {activeTab === 'add' && (
          <div className="animate-in fade-in zoom-in duration-300 space-y-6">
            
            {/* Type Switcher */}
            <div className="bg-zinc-900 p-1.5 rounded-full flex relative border border-zinc-800">
              <button onClick={() => setEntryType('expense')} className={`flex-1 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${entryType === 'expense' ? 'bg-zinc-800 text-white shadow-lg shadow-rose-900/20 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <ArrowUpRight size={16} className={entryType === 'expense' ? 'text-rose-400' : ''}/> Expense
              </button>
              <button onClick={() => setEntryType('income')} className={`flex-1 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${entryType === 'income' ? 'bg-zinc-800 text-white shadow-lg shadow-emerald-900/20 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <ArrowDownLeft size={16} className={entryType === 'income' ? 'text-emerald-400' : ''}/> Income
              </button>
            </div>

            {/* Main Input Card */}
            <Card className="relative overflow-hidden border-zinc-800">
              <div className={`absolute top-0 left-0 right-0 h-1 opacity-60 ${entryType === 'expense' ? 'bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500' : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500'}`}></div>
              
              {!showSmartAdd ? (
                <button onClick={() => setShowSmartAdd(true)} className="w-full mb-6 group relative overflow-hidden rounded-2xl bg-zinc-800/50 p-4 transition-all hover:bg-zinc-800 border border-zinc-700/50 hover:border-indigo-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-900/20 group-hover:scale-110 transition-transform">
                        <Wand2 size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors">Magic Add</p>
                        <p className="text-[10px] text-zinc-500">"Coffee $5" or upload receipt</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </button>
              ) : (
                <div className="mb-6 bg-zinc-950/50 p-4 rounded-2xl border border-indigo-500/30 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2"><Sparkles size={12}/> AI Assistant</span>
                    <button onClick={() => setShowSmartAdd(false)} className="bg-zinc-800 p-1 rounded-full text-zinc-400 hover:text-white"><X size={14}/></button>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input autoFocus value={smartInput} onChange={e => setSmartInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSmartAdd()} placeholder="Type or speak..." className="w-full bg-zinc-900 text-sm text-white pl-4 pr-10 py-3 rounded-xl border border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                      <button onClick={handleVoiceInput} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${isListening ? 'text-red-400 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'}`}><Mic size={16}/></button>
                    </div>
                    <label className="bg-zinc-800 text-zinc-300 px-3 rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-700 border border-zinc-700"><Camera size={18}/><input type="file" hidden onChange={handleReceiptUpload} /></label>
                    <button onClick={handleSmartAdd} disabled={isProcessingAI} className="bg-indigo-600 text-white px-4 rounded-xl font-bold text-xs hover:bg-indigo-500">{isProcessingAI ? <Loader2 size={16} className="animate-spin"/> : 'Go'}</button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-zinc-500">$</span>
                    <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-950/50 text-3xl font-black text-white pl-10 pr-4 py-4 rounded-2xl border-2 border-zinc-800 focus:border-indigo-500/50 focus:bg-zinc-900 outline-none transition-all placeholder-zinc-800" placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-4">
                  <input type="text" required value={item} onChange={e => setItem(e.target.value)} placeholder={entryType === 'income' ? "Source (e.g. Salary)" : "Item (e.g. Burger)"} className="w-full bg-zinc-900 text-zinc-100 px-5 py-4 rounded-2xl border border-zinc-800 focus:border-zinc-600 outline-none font-medium" />
                  
                  <div className="grid grid-cols-2 gap-3">
                    {entryType === 'expense' && (
                      <div className="relative">
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-zinc-900 text-zinc-100 px-5 py-4 rounded-2xl border border-zinc-800 focus:border-zinc-600 outline-none appearance-none font-medium">
                          {['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ArrowDownLeft size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                      </div>
                    )}
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`w-full bg-zinc-900 text-zinc-400 px-5 py-4 rounded-2xl border border-zinc-800 focus:border-zinc-600 outline-none font-medium ${entryType === 'income' ? 'col-span-2' : ''}`} />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${entryType === 'income' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'}`}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> Confirm Transaction</>}
                </button>
              </form>
            </Card>
          </div>
        )}

        {/* --- TAB: HISTORY --- */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900 p-2 rounded-2xl border border-zinc-800 flex items-center gap-3 sticky top-24 z-20 backdrop-blur-lg bg-zinc-900/90">
              <div className="bg-zinc-800 p-2 rounded-xl text-zinc-400"><Calendar size={18}/></div>
              <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className="bg-transparent text-zinc-200 text-sm font-bold outline-none flex-1" />
              {searchDate && <button onClick={() => setSearchDate('')} className="p-2 text-zinc-500 hover:text-white"><X size={18}/></button>}
            </div>

            <div className="space-y-2">
              {filteredExpenses.map((exp, i) => (
                <Card key={exp.id} className={`p-4 flex justify-between items-center group border-l-4 ${exp.type === 'income' ? 'hover:border-emerald-500/30' : 'hover:border-rose-500/30'}`} style={{ borderLeftColor: exp.type === 'income' ? '#10b981' : '#f43f5e', animationDelay: `${i * 30}ms` }}>
                  <div className="flex gap-4 items-center">
                    <div className={`p-3 rounded-2xl ${exp.type === 'income' ? 'bg-emerald-900/20 text-emerald-400' : 'bg-rose-900/20 text-rose-400'}`}>
                      {exp.type === 'income' ? <ArrowDownLeft size={20}/> : <ShoppingBag size={20}/>}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-200">{exp.item}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <CategoryBadge category={exp.category} type={exp.type} />
                        <span className="text-[10px] text-zinc-500 font-mono">{exp.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${exp.type === 'income' ? 'text-emerald-400' : 'text-zinc-100'}`}>
                      {exp.type === 'income' ? '+' : '-'}${Number(exp.amount).toFixed(2)}
                    </p>
                    <button onClick={() => handleDelete(exp.id)} className="text-zinc-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                  </div>
                </Card>
              ))}
              {filteredExpenses.length === 0 && <div className="text-center py-12 text-zinc-600"><History size={32} className="mx-auto mb-2 opacity-20"/><p>No history found</p></div>}
            </div>
          </div>
        )}

        {/* --- TAB: VISUALIZE --- */}
        {activeTab === 'visualize' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            {/* Balance Summary */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-5 bg-gradient-to-br from-emerald-900/30 to-zinc-900 border-emerald-500/20">
                <div className="text-emerald-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><ArrowDownLeft size={12}/> Income</div>
                <div className="text-2xl font-black text-emerald-400">${totalIncome.toFixed(0)}</div>
              </Card>
              <Card className="p-5 bg-gradient-to-br from-rose-900/30 to-zinc-900 border-rose-500/20">
                <div className="text-rose-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><ArrowUpRight size={12}/> Expenses</div>
                <div className="text-2xl font-black text-rose-400">${totalExpenses.toFixed(0)}</div>
              </Card>
            </div>

            {/* Chart Controls */}
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              {[7, 30].map(p => (
                <button key={p} onClick={() => setChartPeriod(p)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${chartPeriod === p ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  Last {p} Days
                </button>
              ))}
            </div>

            {/* Month Survival Stats (RESTORED OLD LAYOUT) */}
            <Card className="p-6 border-blue-900/30 bg-gradient-to-br from-zinc-900 to-blue-900/10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-bold text-blue-200 text-lg flex items-center gap-2"><Calendar size={18}/> Survival Mode</h2>
                  <p className="text-xs text-blue-400/60 mt-1">{monthStats.daysLeft} days ({monthStats.workingDaysLeft} working) left</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Daily Budget</p>
                  <p className="text-2xl font-bold text-white">${(balance / Math.max(1, monthStats.daysLeft)).toFixed(0)}</p>
                </div>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${((monthStats.daysInMonth - monthStats.daysLeft) / monthStats.daysInMonth) * 100}%` }}></div>
              </div>
            </Card>

            {/* Charts */}
            <Card className="p-6">
              <h2 className="font-bold text-zinc-200 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-400"/> Spending Trend</h2>
              <div className="h-40 flex items-end justify-between gap-1">
                {chartData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center group relative cursor-pointer" onClick={() => setFocusedBar(d.date)}>
                    <div className="w-full bg-zinc-800/50 rounded-t-md relative overflow-hidden" style={{height: '100%'}}>
                      <div className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${focusedBar === d.date ? 'bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.5)]' : 'bg-indigo-600/80 group-hover:bg-indigo-500'}`} style={{ height: `${Math.max(d.percent, 2)}%` }}></div>
                    </div>
                    {(i % (chartPeriod === 30 ? 5 : 1) === 0) && <span className="text-[9px] text-zinc-600 mt-2 font-mono">{d.day}</span>}
                    {focusedBar === d.date && <div className="absolute bottom-full mb-2 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded border border-zinc-700">${d.amount}</div>}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-bold text-zinc-200 mb-6 flex items-center gap-2"><PieChart size={18} className="text-purple-400"/> Breakdown</h2>
              <div className="space-y-3">
                {categoryData.map((cat, i) => (
                  <div key={i} className="group cursor-pointer" onClick={() => setFocusedCategory(cat.name === focusedCategory ? null : cat.name)}>
                    <div className="flex justify-between text-xs mb-2">
                      <span className={`font-bold ${focusedCategory === cat.name ? 'text-white' : 'text-zinc-400'}`}>{cat.name}</span>
                      <span className="text-zinc-500 font-mono">${cat.value.toFixed(0)} ({Math.round(cat.percent)}%)</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500'][i % 4]}`} style={{ width: `${cat.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* --- TAB: AI TOOLS (NEW) --- */}
        {activeTab === 'ai-tools' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            
            {/* AI Assistant Card (Restored & Styled) */}
            <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-zinc-900 border-purple-500/30 relative overflow-hidden">
               <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
               <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-purple-300 relative z-10">
                 <Bot size={20} /> AI Assistant
               </h2>
               <div className="grid grid-cols-2 gap-3 relative z-10">
                  <button onClick={() => handleAIAction('analyze')} disabled={isProcessingAI} className="bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-200 py-4 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
                     <Brain size={16} className="text-purple-400"/> Analyze
                  </button>
                  <button onClick={() => handleAIAction('roast')} disabled={isProcessingAI} className="bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-200 py-4 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
                     <Flame size={16} className="text-orange-400"/> Roast Me
                  </button>
                  <button onClick={() => handleAIAction('advice')} disabled={isProcessingAI} className="bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-200 py-4 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
                     <PiggyBank size={16} className="text-emerald-400"/> Savings Tips
                  </button>
                  <button onClick={() => handleAIAction('opportunity')} disabled={isProcessingAI} className="bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-200 py-4 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
                     <TrendingUp size={16} className="text-blue-400"/> Forecast
                  </button>
               </div>
               {isProcessingAI && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-purple-400" size={24}/></div>}
               {analysisResult && (
                  <div className={`mt-6 p-5 rounded-2xl border ${getAIBoxColor()} animate-in zoom-in relative z-10 bg-zinc-900/90`}>
                     <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-sm capitalize text-white flex items-center gap-2">
                           <Sparkles size={14}/> {analysisType} Result
                        </h4>
                        <button onClick={() => setAnalysisResult(null)}><X size={14} className="text-white/60 hover:text-white"/></button>
                     </div>
                     <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">{analysisResult}</p>
                  </div>
               )}
            </Card>

            {/* Persona Card */}
            <Card className="bg-gradient-to-br from-indigo-900/20 to-zinc-900 border-indigo-500/30 p-6 text-center">
              {personaResult ? (
                <div className="animate-in zoom-in">
                  <div className="text-5xl mb-3">🧙‍♂️</div>
                  <h2 className="text-xl font-black text-indigo-300 mb-1">{personaResult.class}</h2>
                  <p className="text-xs text-indigo-200/60 italic">"{personaResult.desc}"</p>
                </div>
              ) : (
                <div className="py-4">
                  <User size={48} className="mx-auto text-indigo-500/20 mb-3"/>
                  <button onClick={() => handleAIAction('persona', "Assign me a funny RPG class based on spending.")} className="bg-indigo-600 text-white px-6 py-2 rounded-full text-xs font-bold hover:bg-indigo-500 transition-all">Reveal Persona</button>
                </div>
              )}
            </Card>

            {/* Deep Dive Tools Grid */}
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">Deep Dive Tools</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'report', icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-900/10', border: 'border-blue-500/20', label: 'Report Card', prompt: "Grade my finances A-F based on spending. Return JSON: {grade, score, comment}." },
                { id: 'tax', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-900/10', border: 'border-emerald-500/20', label: 'Tax Scout', prompt: "Find potential tax deductions in my expenses. Return JSON: [{item, amount, reason}]." },
                { id: 'subscriptions', icon: Repeat, color: 'text-purple-400', bg: 'bg-purple-900/10', border: 'border-purple-500/20', label: 'Sub Detective', prompt: "Find recurring subscriptions. Return JSON: [{name, amount, frequency}]." },
                { id: 'opportunity', icon: Gift, color: 'text-pink-400', bg: 'bg-pink-900/10', border: 'border-pink-500/20', label: 'Opp. Cost', prompt: "What cool thing could I buy if I cut my top expense category by 50%? Return JSON: {item, price, message}." },
              ].map(tool => (
                <div key={tool.id} className={`p-4 rounded-[24px] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:scale-[1.02] border ${tool.bg} ${tool.border}`} onClick={() => handleAIAction(tool.id, tool.prompt)}>
                  <div className={`p-3 rounded-2xl bg-zinc-900 shadow-sm`}>
                    <tool.icon size={20} className={tool.color} />
                  </div>
                  <span className="text-xs font-bold text-zinc-300">{tool.label}</span>
                </div>
              ))}
            </div>

            {/* Purchase Advisor */}
            <Card className="p-6 border-pink-500/20">
              <h2 className="font-bold text-zinc-200 mb-4 flex items-center gap-2"><ShoppingBag size={18} className="text-pink-400"/> Can I Afford This?</h2>
              <div className="flex gap-2">
                <input value={advisorInput} onChange={e => setAdvisorInput(e.target.value)} placeholder="e.g. PS5 $500" className="flex-1 bg-zinc-950 text-sm px-4 py-3 rounded-xl border border-zinc-700 focus:border-pink-500 outline-none" />
                <button onClick={() => handleAIAction('advice', `Can I afford "${advisorInput}"? My balance is $${balance}. Return JSON: {verdict: "YES/NO/MAYBE", reason}.`)} className="bg-pink-600 text-white px-4 rounded-xl font-bold text-xs shadow-lg shadow-pink-900/20">Ask</button>
              </div>
              {advisorResult && (
                <div className={`mt-4 p-4 rounded-xl border ${advisorResult.verdict === 'YES' ? 'bg-emerald-900/20 border-emerald-800 text-emerald-300' : 'bg-rose-900/20 border-rose-800 text-rose-300'}`}>
                  <div className="font-black text-lg mb-1 flex items-center gap-2">{advisorResult.verdict === 'YES' ? <ThumbsUp size={18}/> : <ThumbsDown size={18}/>} {advisorResult.verdict}</div>
                  <p className="text-xs opacity-80">{advisorResult.reason}</p>
                </div>
              )}
            </Card>

            {/* Dynamic AI Result Display Area */}
            {(reportCard || taxDeductions || subscriptions || opportunityResult) && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-zinc-900 w-full max-w-sm rounded-[32px] border border-zinc-700 p-6 shadow-2xl animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl text-white flex items-center gap-2"><Bot size={24} className="text-indigo-400"/> AI Insight</h3>
                    <button onClick={() => { setReportCard(null); setTaxDeductions(null); setSubscriptions(null); setOpportunityResult(null); }} className="bg-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white"><X size={18}/></button>
                  </div>
                  
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {reportCard && (
                      <div className="text-center">
                        <div className="text-6xl font-black text-indigo-400 mb-2">{reportCard.grade}</div>
                        <div className="text-sm text-zinc-400 italic px-4">"{reportCard.comment}"</div>
                      </div>
                    )}
                    {opportunityResult && (
                      <div className="text-center py-4">
                        <p className="text-zinc-400 text-xs mb-3 uppercase tracking-widest">You could have bought</p>
                        <div className="text-3xl font-black text-teal-300 mb-1 leading-tight">{opportunityResult.item}</div>
                        <div className="text-sm font-bold text-teal-500/80 mb-4">{opportunityResult.price}</div>
                        <div className="bg-teal-900/30 p-3 rounded-xl border border-teal-500/20">
                           <p className="text-xs text-teal-200 italic">"{opportunityResult.message}"</p>
                        </div>
                      </div>
                    )}
                    {subscriptions && (
                      <div className="space-y-2">
                        {subscriptions.length ? subscriptions.map((s, i) => (
                          <div key={i} className="flex justify-between p-4 bg-zinc-800 rounded-2xl">
                            <span className="font-bold text-zinc-200">{s.name}</span>
                            <span className="text-purple-400 font-mono font-bold">${s.amount}<span className="text-zinc-600 text-xs font-normal">/{s.frequency?.[0]}</span></span>
                          </div>
                        )) : <p className="text-center text-zinc-500">No subscriptions found.</p>}
                      </div>
                    )}
                    {taxDeductions && (
                      <div className="space-y-2">
                        {taxDeductions.length ? taxDeductions.map((t, i) => (
                          <div key={i} className="p-4 bg-zinc-800 rounded-2xl">
                            <div className="flex justify-between mb-1">
                              <span className="font-bold text-zinc-200">{t.item}</span>
                              <span className="text-emerald-400 font-mono font-bold">${t.amount}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500">{t.reason}</p>
                          </div>
                        )) : <p className="text-center text-zinc-500">No deductions found.</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB: CHAT --- */}
        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-220px)] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex-1 overflow-y-auto space-y-4 p-1">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-300 rounded-bl-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && <div className="self-start bg-zinc-800 p-4 rounded-2xl rounded-bl-none"><Loader2 className="animate-spin w-4 h-4 text-zinc-500"/></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="fixed bottom-24 left-0 right-0 px-4 max-w-md mx-auto">
              <div className="bg-zinc-900/90 backdrop-blur-md p-2 rounded-3xl border border-zinc-800 flex gap-2 shadow-2xl">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Ask me anything..." className="flex-1 bg-transparent text-sm text-white px-4 focus:outline-none" />
                <button onClick={handleChat} className="bg-indigo-600 p-3 rounded-full text-white hover:bg-indigo-500 transition-colors"><Send size={18}/></button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: SETTINGS --- */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <Card>
              <h2 className="font-bold text-zinc-200 mb-6 flex items-center gap-2"><Settings size={20} className="text-zinc-500"/> Config</h2>
              <div className="space-y-4">
                <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Sheet URL</label><input type="text" value={scriptUrl} onChange={e => setScriptUrl(e.target.value)} className="w-full bg-zinc-950 text-zinc-300 px-4 py-3 rounded-xl border border-zinc-800 text-sm focus:border-indigo-500 outline-none"/></div>
                <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Gemini API Key</label><input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full bg-zinc-950 text-zinc-300 px-4 py-3 rounded-xl border border-zinc-800 text-sm focus:border-purple-500 outline-none"/></div>
                <button onClick={handleSaveSettings} className="w-full py-3 bg-zinc-100 text-zinc-900 font-bold rounded-xl text-sm hover:bg-white transition-colors">Save Changes</button>
              </div>
              <div className="border-t border-zinc-800 mt-6 pt-6"><SetupGuide /></div>
            </Card>
            <button onClick={() => signOut(auth)} className="w-full py-4 text-red-400 text-sm font-bold hover:bg-red-950/30 rounded-2xl transition-colors flex items-center justify-center gap-2"><LogOut size={18}/> Sign Out</button>
          </div>
        )}
      </main>

      {/* --- NAVIGATION --- */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-full bg-black/20 backdrop-blur-2xl border border-white/10 shadow-2xl z-50">
        {['add', 'history', 'visualize', 'ai-tools', 'chat', 'settings'].map(t => {
          const isActive = activeTab === t;
          return (
            <button 
              key={t} 
              onClick={() => setActiveTab(t)} 
              className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
            >
              {t==='add'?<PlusCircle size={22}/>:t==='history'?<History size={22}/>:t==='visualize'?<BarChart3 size={22}/>:t==='ai-tools'?<Sparkles size={22}/>:t==='chat'?<MessageSquare size={22}/>:<Settings size={22}/>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
