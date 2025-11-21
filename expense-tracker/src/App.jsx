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
  FileText
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

// Default Gemini Key
const defaultGeminiKey = ""; 

// --- Components ---

const SetupGuide = () => (
  <div className="space-y-4 text-sm text-slate-600 animate-in fade-in duration-500">
    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
      <h3 className="font-bold text-purple-800 flex items-center gap-2">
        <Sparkles size={16} /> Gemini AI Features
      </h3>
      <p className="mt-2">This app uses Gemini to:</p>
      <ul className="list-disc list-inside mt-1 ml-1 space-y-1 text-purple-700/80">
        <li><strong>Magic Fill:</strong> Type/Speak to fill forms.</li>
        <li><strong>Receipt Scan:</strong> Extract data from photos.</li>
        <li><strong>Purchase Advisor:</strong> Ask AI if you can afford items.</li>
        <li><strong>Tax Scout:</strong> Find potential tax deductions.</li>
      </ul>
    </div>
    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
      <h3 className="font-bold text-blue-800 flex items-center gap-2">
        <Sheet size={16} /> Google Sheets Setup
      </h3>
      <ol className="list-decimal list-inside mt-2 space-y-1 ml-1 text-blue-700/80">
        <li>Create a Google Sheet. Go to Extensions {'>'} Apps Script.</li>
        <li>Paste the code below. Click Deploy {'>'} Web App.</li>
        <li>Set "Who has access" to <strong>Anyone</strong>.</li>
        <li>Copy the URL and paste it below.</li>
      </ol>
    </div>
    <div className="bg-slate-800 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
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
    className={`bg-white rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-md ${className}`}
  >
    {children}
  </div>
);

const CategoryBadge = ({ category, type }) => {
  if (type === 'income') {
    return (
      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 uppercase tracking-wide">
        {category || 'Income'}
      </span>
    );
  }
  
  const colors = {
    Food: 'bg-orange-50 text-orange-600 border-orange-100',
    Transport: 'bg-blue-50 text-blue-600 border-blue-100',
    Utilities: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    Entertainment: 'bg-purple-50 text-purple-600 border-purple-100',
    Shopping: 'bg-pink-50 text-pink-600 border-pink-100',
    Health: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    Other: 'bg-slate-50 text-slate-600 border-slate-100',
  };
  const style = colors[category] || colors.Other;
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wide ${style}`}>
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
  const [entryType, setEntryType] = useState('expense'); // 'expense' or 'income'
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
  
  // New AI Feature States
  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorResult, setAdvisorResult] = useState(null);
  const [personaResult, setPersonaResult] = useState(null);
  const [subscriptions, setSubscriptions] = useState(null);
  const [opportunityResult, setOpportunityResult] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [taxDeductions, setTaxDeductions] = useState(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: "Hi! I'm your financial assistant. Ask me things like 'How much did I spend on food?'" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Visualization & Search State
  const [chartPeriod, setChartPeriod] = useState(7); 
  const [focusedBar, setFocusedBar] = useState(null);
  const [focusedCategory, setFocusedCategory] = useState(null);
  const [searchDate, setSearchDate] = useState('');

  // --- Auth & Data Loading ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth failed", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load Settings, Expenses
  useEffect(() => {
    if (!user) return;

    const getPath = (col) => collection(db, 'artifacts', appId, 'users', user.uid, col);
    
    const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    getDoc(settingsRef).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setScriptUrl(data.scriptUrl || '');
        setGeminiKey(data.geminiKey || '');
        if (data.persona) setPersonaResult(data.persona);
        if (data.subscriptions) setSubscriptions(data.subscriptions);
      }
    });

    const unsubscribeExpenses = onSnapshot(getPath('expenses'), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(loaded);
    });

    return () => unsubscribeExpenses();
  }, [user]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // --- Filtered Data ---
  const filteredExpenses = useMemo(() => {
    if (!searchDate) return expenses;
    return expenses.filter(e => e.date === searchDate);
  }, [expenses, searchDate]);

  // --- AI Functions ---

  const callGemini = async (prompt, imageBase64 = null) => {
    const keyToUse = geminiKey || defaultGeminiKey;
    if (!keyToUse) throw new Error("Please add a Gemini API Key in Settings.");

    const parts = [{ text: prompt }];
    
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1];
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${keyToUse}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  };

  const parseGeminiJson = (text) => {
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  };

  const handleSmartAdd = async () => {
    if (!smartInput.trim()) return;
    setIsProcessingAI(true);
    try {
      const prompt = `Extract expense details from this text: "${smartInput}". Return ONLY a valid JSON object with keys: item (string), amount (number), category (string: Food, Transport, Utilities, Entertainment, Shopping, Health, Other), notes (string), type (string: "expense" or "income"). If it looks like income (salary, sold something), set type to income.`;
      const resultText = await callGemini(prompt);
      const data = parseGeminiJson(resultText);
      if (data.amount) setAmount(data.amount.toString());
      if (data.item) setItem(data.item);
      if (data.category) setCategory(data.category);
      if (data.notes) setNotes(data.notes);
      if (data.type) setEntryType(data.type.toLowerCase());
      setShowSmartAdd(false);
      setSmartInput('');
      showNotification("✨ Magic Fill successful!");
    } catch (err) {
      showNotification("AI Parsing failed: " + err.message, "error");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSmartInput(transcript);
    };
    recognition.start();
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessingAI(true);
    showNotification("📸 Scanning receipt...", "loading");
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const prompt = `Extract from receipt: Total Amount (number), Main Vendor/Item (string), Date (YYYY-MM-DD), Category (Food, Transport, Utilities, Entertainment, Shopping, Health, Other). Return ONLY JSON.`;
        const text = await callGemini(prompt, reader.result);
        const data = parseGeminiJson(text);
        if (data.amount) setAmount(data.amount.toString());
        if (data.item) setItem(data.item); 
        if (data.category) setCategory(data.category);
        if (data.date) setDate(data.date);
        setEntryType('expense');
        setShowSmartAdd(false);
        showNotification("✨ Receipt scanned!");
      } catch (err) {
        showNotification("Scan failed: " + err.message, "error");
      } finally {
        setIsProcessingAI(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFindSubscriptions = async () => {
    setIsProcessingAI(true);
    const expenseList = expenses.filter(e => e.type !== 'income');
    const recent = expenseList.slice(0, 100).map(e => `${e.date}: $${e.amount} at ${e.item}`).join('\n');
    const prompt = `
      Analyze these expenses and identify potential recurring subscriptions or bills (e.g., Netflix, Spotify, Gym, Internet, Rent).
      Return JSON: [{ "name": "Service Name", "amount": 10, "frequency": "Monthly/Yearly" }]
      If none found, return empty array.
      Expenses:
      ${recent}
    `;
    try {
      const text = await callGemini(prompt);
      const res = parseGeminiJson(text);
      setSubscriptions(res);
      if (user) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), { subscriptions: res }, { merge: true });
      }
    } catch (err) {
      showNotification("Scan failed", "error");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleOpportunityCost = async () => {
    setIsProcessingAI(true);
    const totals = {};
    expenses.filter(e => e.type !== 'income').forEach(e => { totals[e.category] = (totals[e.category] || 0) + Number(e.amount); });
    const topCat = Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b, 'Food');
    const amount = totals[topCat] || 0;

    const prompt = `
      I spend $${amount} on ${topCat} recently. 
      If I cut this spending by 50% for a year, what cool/fun thing could I buy instead? 
      Be creative and motivating.
      Return JSON: { "item": "A round-trip ticket to Tokyo", "price": "$1200", "message": "Imagine the sushi!" }
    `;

    try {
      const text = await callGemini(prompt);
      const res = parseGeminiJson(text);
      setOpportunityResult(res);
    } catch (err) {
      showNotification("Calc failed", "error");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleGeneratePersona = async () => {
    setIsProcessingAI(true);
    const expenseList = expenses.filter(e => e.type !== 'income');
    const recent = expenseList.slice(0, 50).map(e => `${e.date}: $${e.amount} on ${e.category}`).join('\n');
    const prompt = `Based on these expenses, assign me a funny "RPG Character Class". Examples: "Level 5 Coffee Mage", "Paladin of Thrift". Return JSON: { "class": "Title", "desc": "Why this class fits me" } Expenses: ${recent}`;
    try {
      const text = await callGemini(prompt);
      const res = parseGeminiJson(text);
      setPersonaResult(res);
      if (user) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), { persona: res }, { merge: true });
      }
    } catch (err) {
      showNotification("Persona failed", "error");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleReportCard = async () => {
    setIsProcessingAI(true);
    const expenseList = expenses.filter(e => e.type !== 'income');
    const incomeList = expenses.filter(e => e.type === 'income');
    const totalExp = expenseList.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalInc = incomeList.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const recent = expenseList.slice(0, 40).map(e => `$${e.amount} on ${e.category}`).join(', ');

    const prompt = `
      Act as a financial teacher. Grade my financial habits (A+ to F) based on:
      Income: $${totalInc}, Expenses: $${totalExp}.
      Spending habits: ${recent}.
      Return JSON: { "grade": "B+", "score": 85, "comment": "A 2-sentence teacher's comment on how to improve." }
    `;

    try {
      const text = await callGemini(prompt);
      setReportCard(parseGeminiJson(text));
    } catch (err) {
      showNotification("Grading failed", "error");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleTaxScout = async () => {
    setIsProcessingAI(true);
    const expenseList = expenses.filter(e => e.type !== 'income');
    const recent = expenseList.map(e => `${e.date}: ${e.item} ($${e.amount})`).join('\n');
    const prompt = `
      Identify potential tax-deductible expenses for a freelancer from this list.
      Return JSON: [{ "item": "Office Chair", "amount": 150, "reason": "Home Office" }]
      If none, return empty array.
      List:
      ${recent}
    `;
    try {
      const text = await callGemini(prompt);
      setTaxDeductions(parseGeminiJson(text));
    } catch (err) {
      showNotification("Scout failed", "error");
    } finally {
      setIsProcessingAI(false);
    }
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
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);
    const context = expenses.map(e => `${e.date}: ${e.type === 'income' ? '+' : '-'}$${e.amount} (${e.item})`).join('\n');
    const prompt = `You are a financial assistant. Use this transaction data to answer the user's question. Data:\n${context}\n\nUser Question: "${userMsg}"\nAnswer briefly and friendly.`;
    try {
      const response = await callGemini(prompt);
      setChatMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't process that request." }]);
    } finally {
      setIsChatLoading(false);
    }
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

  // --- Actions ---

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), {
        scriptUrl: scriptUrl.trim(),
        geminiKey: geminiKey.trim()
      }, { merge: true });
      showNotification("Settings saved successfully");
    } catch (e) {
      showNotification("Failed to save settings", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !item) return;
    setIsSubmitting(true);
    const expenseData = { 
      type: entryType, 
      date, 
      category: entryType === 'income' ? 'Income' : category, 
      item, 
      amount: parseFloat(amount), 
      notes, 
      createdAt: serverTimestamp() 
    };
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'expenses'), expenseData);
      if (scriptUrl) {
        await fetch(scriptUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expenseData) });
      }
      setAmount(''); setItem(''); setNotes('');
      showNotification("Transaction Saved!");
    } catch (error) {
      showNotification("Error saving", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', id)); } catch (e) { console.error(e); }
  };

  // --- Calculations ---
  const totalIncome = useMemo(() => expenses.filter(e => e.type === 'income').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0), [expenses]);
  const totalExpenses = useMemo(() => expenses.filter(e => e.type !== 'income').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0), [expenses]);
  const balance = totalIncome - totalExpenses;
  
  // --- Stats Logic ---
  const monthStats = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const daysRemaining = totalDays - today;
    let totalWorkingDays = 0;
    let workingDaysLeft = 0;
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const day = d.getDay();
      if (day !== 5 && day !== 6) { 
        totalWorkingDays++;
        if (i > today) workingDaysLeft++;
      }
    }
    return { totalDays, daysRemaining, totalWorkingDays, workingDaysLeft };
  }, []);

  // --- Chart Logic (Expenses Only) ---
  const chartData = useMemo(() => {
    const days = [];
    for (let i = chartPeriod - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({ date: dateStr, day: dayLabel, fullDate: fullLabel, amount: 0, items: [] });
    }
    expenses.filter(e => e.type !== 'income').forEach(e => {
      const day = days.find(d => d.date === e.date);
      if (day) {
        const amt = parseFloat(e.amount) || 0;
        day.amount += amt;
        day.items.push({ item: e.item, amount: amt });
      }
    });
    const max = Math.max(...days.map(d => d.amount), 1); 
    return { 
      data: days.map(d => ({ ...d, height: (d.amount / max) * 100, percent: (d.amount / max) * 100 })),
      total: days.reduce((acc, curr) => acc + curr.amount, 0),
      max
    };
  }, [expenses, chartPeriod]);

  const categoryBreakdown = useMemo(() => {
    const totals = {};
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - chartPeriod);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    expenses.filter(e => e.type !== 'income' && e.date >= cutoffStr).forEach(e => { 
      totals[e.category] = (totals[e.category] || 0) + (parseFloat(e.amount) || 0); 
    });
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals).map(([name, value]) => ({ name, value, percent: total ? (value / total) * 100 : 0 })).sort((a, b) => b.value - a.value);
  }, [expenses, chartPeriod]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400"><Loader2 className="animate-spin" size={32} /></div>;

  const getAIBoxColor = () => {
    switch(analysisType) {
      case 'roast': return 'bg-gradient-to-r from-orange-500 to-red-600 border-orange-200';
      case 'savings': return 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-200';
      case 'forecast': return 'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-200';
      default: return 'bg-gradient-to-r from-purple-500 to-indigo-600 border-purple-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-28 selection:bg-indigo-100">
      {/* Interactive Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 pb-16 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl"></div>
        
        <div className="max-w-md mx-auto flex justify-between items-center relative z-10">
          <div className="animate-in slide-in-from-left duration-500">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <CreditCard className="text-white" size={24} /> 
              </div>
              Krithagho's ExpenseLog
            </h1>
          </div>
          <div className="text-right animate-in slide-in-from-right duration-500 delay-100">
            <p className="text-xs text-indigo-100 uppercase tracking-wider font-semibold opacity-80">Net Balance</p>
            <p className={`text-3xl font-bold tracking-tight transition-colors duration-300 ${balance < 0 ? 'text-red-200' : 'text-white'}`}>
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto -mt-10 px-4 relative z-10">
        {notification && (
          <div className={`mb-4 p-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-5 fade-in duration-300 border ${notification.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}`}>
            <div className={`p-1 rounded-full ${notification.type === 'error' ? 'bg-red-100' : 'bg-emerald-100'}`}>
              {notification.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle size={16}/>}
            </div>
            {notification.msg}
          </div>
        )}

        <div className="space-y-6">
          {activeTab === 'add' && (
            <div className="animate-in fade-in zoom-in duration-300">
              <Card className="p-1">
                {/* Entry Type Switcher */}
                <div className="flex bg-slate-100/80 p-1 rounded-t-xl mb-4 border-b border-slate-100">
                  <button 
                    onClick={() => setEntryType('expense')} 
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${entryType === 'expense' ? 'bg-white text-red-500 shadow-sm scale-100' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    <div className={`p-1 rounded-full ${entryType === 'expense' ? 'bg-red-50' : 'bg-transparent'}`}><ArrowUpRight size={16}/></div> Expense
                  </button>
                  <button 
                    onClick={() => setEntryType('income')} 
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${entryType === 'income' ? 'bg-white text-green-600 shadow-sm scale-100' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    <div className={`p-1 rounded-full ${entryType === 'income' ? 'bg-green-50' : 'bg-transparent'}`}><ArrowDownLeft size={16}/></div> Income
                  </button>
                </div>

                <div className="px-5 pb-5">
                  <div className="mb-6">
                    {!showSmartAdd ? (
                      <div className="flex gap-3">
                        <button onClick={() => setShowSmartAdd(true)} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-md shadow-indigo-200 flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                          <Wand2 size={18} /> Magic Fill
                        </button>
                        <label className="cursor-pointer bg-slate-800 text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-md flex items-center justify-center gap-2 hover:bg-slate-900 hover:scale-[1.02] active:scale-95 transition-all">
                          <Camera size={18} />
                          <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} disabled={isProcessingAI} />
                        </label>
                      </div>
                    ) : (
                      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={14} className="text-indigo-500 animate-pulse" /> Describe or Upload
                          </label>
                          <button onClick={() => setShowSmartAdd(false)} className="text-slate-400 hover:text-slate-600 hover:bg-indigo-100 p-1 rounded-full transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                             <input 
                               type="text" 
                               autoFocus 
                               value={smartInput} 
                               onChange={e => setSmartInput(e.target.value)} 
                               onKeyDown={e => e.key === 'Enter' && handleSmartAdd()} 
                               placeholder='e.g. "Salary $5000"' 
                               className="w-full text-sm pl-3 pr-10 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                             />
                             <button 
                               onClick={handleVoiceInput} 
                               disabled={isListening} 
                               className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400 hover:bg-slate-100'}`}
                             >
                               <Mic size={16} />
                             </button>
                          </div>
                          <button 
                            onClick={handleSmartAdd} 
                            disabled={isProcessingAI || !smartInput} 
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center shadow-md transition-all active:scale-95"
                          >
                            {isProcessingAI ? <Loader2 size={16} className="animate-spin" /> : 'Go'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="group">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-indigo-600 transition-colors">Amount</label>
                      <div className="relative transform transition-all duration-200 group-focus-within:scale-[1.01]">
                        <DollarSign className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input 
                          type="number" 
                          step="0.01" 
                          required 
                          value={amount} 
                          onChange={e => setAmount(e.target.value)} 
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-xl font-bold text-slate-800 transition-all shadow-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    
                    {entryType === 'income' ? (
                       <div className="space-y-5 animate-in fade-in slide-in-from-left-2">
                         <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Source</label>
                           <input type="text" required value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. Freelance" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none font-medium transition-all"/>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none font-medium transition-all"/>
                         </div>
                       </div>
                    ) : (
                       <div className="space-y-5 animate-in fade-in slide-in-from-right-2">
                         <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Details</label>
                           <input type="text" required value={item} onChange={e => setItem(e.target.value)} placeholder="What did you buy?" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"/>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                             <div className="relative">
                               <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium transition-all">
                                 {['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                 <ArrowDownLeft size={14} className="rotate-45"/>
                               </div>
                             </div>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"/>
                           </div>
                         </div>
                       </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all" placeholder="Optional details..."></textarea>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transform transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 ${entryType === 'income' ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-200' : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-200'}`}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <><PlusCircle size={20} strokeWidth={2.5} /> {entryType === 'income' ? 'Add Income' : 'Save Expense'}</>}
                    </button>
                  </form>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
               {/* Date Search Filter */}
               <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 sticky top-0 z-20 backdrop-blur-md bg-white/90">
                  <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                      <Calendar size={20} />
                  </div>
                  <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter by Date</label>
                      <input 
                          type="date" 
                          value={searchDate}
                          onChange={(e) => setSearchDate(e.target.value)}
                          className="w-full bg-transparent outline-none text-slate-700 text-sm font-bold cursor-pointer"
                      />
                  </div>
                  {searchDate && (
                      <button onClick={() => setSearchDate('')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                          <X size={20} />
                      </button>
                  )}
               </div>

              {filteredExpenses.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center">
                      <div className="bg-slate-100 p-6 rounded-full mb-4">
                        <History size={48} className="opacity-40" />
                      </div>
                      <p className="font-medium">{searchDate ? "No records found for this day." : "No records yet."}</p>
                  </div>
              ) : (
                  <div className="space-y-3">
                    {filteredExpenses.map((exp, index) => (
                      <Card 
                        key={exp.id} 
                        className="p-4 flex justify-between items-center group cursor-pointer"
                        style={{ animationDelay: `${index * 50}ms` }} // Staggered animation
                      >
                        <div className="flex gap-4 items-center">
                          <div className={`p-3 rounded-2xl shadow-sm ${exp.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'}`}>
                            {exp.type === 'income' ? <ArrowDownLeft size={20}/> : <ArrowUpRight size={20}/>}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base">{exp.item}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <CategoryBadge category={exp.category} type={exp.type} />
                              <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${exp.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                            {exp.type === 'income' ? '+' : '-'}${Number(exp.amount).toFixed(2)}
                          </p>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }} 
                            className="text-red-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
              )}
            </div>
          )}

          {activeTab === 'visualize' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              {/* Balance Sheet Card */}
              <Card className="p-6 bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <Wallet size={120} />
                </div>
                <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800 relative z-10">
                   <Wallet size={20} className="text-indigo-500"/> Balance Sheet
                </h2>
                <div className="space-y-4 relative z-10">
                   <div className="flex justify-between items-center p-4 bg-green-50/50 rounded-2xl border border-green-100/50 backdrop-blur-sm">
                      <div className="flex items-center gap-3 text-green-800 font-bold"><div className="bg-white p-1.5 rounded-lg shadow-sm"><ArrowDownLeft size={16}/></div> Income</div>
                      <div className="text-lg font-bold text-green-700">+${totalIncome.toFixed(2)}</div>
                   </div>
                   <div className="flex justify-between items-center p-4 bg-red-50/50 rounded-2xl border border-red-100/50 backdrop-blur-sm">
                      <div className="flex items-center gap-3 text-red-800 font-bold"><div className="bg-white p-1.5 rounded-lg shadow-sm"><ArrowUpRight size={16}/></div> Expenses</div>
                      <div className="text-lg font-bold text-red-700">-${totalExpenses.toFixed(2)}</div>
                   </div>
                   <div className="border-t border-dashed border-slate-200 pt-4 mt-2">
                     <div className="flex justify-between items-center">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Remaining</div>
                        <div className={`text-3xl font-black ${balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                          ${balance.toFixed(2)}
                        </div>
                     </div>
                   </div>
                </div>
              </Card>

              <div className="flex bg-slate-200 p-1 rounded-xl">
                <button onClick={() => setChartPeriod(7)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${chartPeriod === 7 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Last 7 Days</button>
                <button onClick={() => setChartPeriod(30)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${chartPeriod === 30 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Last 30 Days</button>
              </div>

              {/* Month Survival Stats */}
              <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none shadow-xl relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full opacity-20 blur-3xl group-hover:opacity-30 transition-opacity duration-500"></div>
                <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-white/90 relative z-10"><Calendar size={20} className="text-indigo-400"/> Month Survival</h2>
                <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider"><Clock size={12} /> Total Days</div>
                    <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-white">{monthStats.daysRemaining}</span><span className="text-xs text-slate-400 font-medium">/ {monthStats.totalDays} left</span></div>
                    <div className="w-full bg-slate-700/50 h-2 rounded-full mt-3 overflow-hidden backdrop-blur-sm"><div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${(monthStats.daysRemaining / monthStats.totalDays) * 100}%` }}></div></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider"><Briefcase size={12} /> Working Days</div>
                    <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-emerald-400">{monthStats.workingDaysLeft}</span><span className="text-xs text-slate-400 font-medium">/ {monthStats.totalWorkingDays} left</span></div>
                    <div className="w-full bg-slate-700/50 h-2 rounded-full mt-3 overflow-hidden backdrop-blur-sm"><div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(monthStats.workingDaysLeft / monthStats.totalWorkingDays) * 100}%` }}></div></div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-6 text-center relative z-10 bg-slate-800/50 p-2 rounded-lg backdrop-blur-sm border border-white/5">
                  Budget for remaining days: <strong className="text-white">${(balance / Math.max(1, monthStats.daysRemaining)).toFixed(0)}</strong> / day
                </p>
              </Card>

              <Card className="p-6">
                <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800"><BarChart3 size={20} className="text-indigo-500"/> Spending Trend</h2>
                <div className="h-48 flex items-end justify-between gap-2">
                  {chartData.data.map((d, i) => { 
                    const showLabel = chartPeriod === 7 || i % 5 === 0; 
                    return (
                      <div 
                        key={i} 
                        className="flex flex-col items-center flex-1 group relative cursor-pointer h-full justify-end" 
                        onClick={() => setFocusedBar(d.date === focusedBar ? null : d.date)}
                      >
                        <div className="w-full relative flex flex-col justify-end h-[80%]">
                          <div 
                            className={`rounded-t-lg w-full transition-all duration-500 ease-out ${focusedBar === d.date ? 'bg-orange-500 shadow-lg shadow-orange-200 scale-105' : 'bg-indigo-500 hover:bg-indigo-400'}`} 
                            style={{ height: `${Math.max(d.percent, 5)}%` }}
                          ></div>
                        </div>
                        <div className="h-6 flex items-center justify-center">
                          {showLabel && <span className="text-[10px] text-slate-400 font-bold mt-2">{chartPeriod === 7 ? d.day : d.day[0]}</span>}
                        </div>
                        
                        {(focusedBar === d.date) && (
                          <div className="absolute bottom-[90%] mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl z-20 w-32 text-center animate-in zoom-in duration-200">
                            <div className="font-bold text-slate-300 border-b border-slate-600 pb-1 mb-1">{d.fullDate}</div>
                            <div className="text-lg font-bold text-white mb-1">${d.amount.toFixed(0)}</div>
                            {d.items.length > 0 && <div className="text-[10px] text-slate-400 italic truncate">{d.items[0].item}</div>}
                            {d.items.length > 1 && <div className="text-[9px] text-slate-500">+{d.items.length - 1} more</div>}
                            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45"></div>
                          </div>
                        )}
                      </div>
                    ); 
                  })}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800"><PieChart size={20} className="text-purple-500"/> Expenses Breakdown</h2>
                <div className="flex justify-center mb-8 relative h-48">
                  {categoryBreakdown.length > 0 ? (
                    <div className="w-48 h-48 rounded-full relative shadow-xl shadow-purple-100" style={{ background: `conic-gradient(${categoryBreakdown.map((c, i, arr) => { const prevPercent = arr.slice(0, i).reduce((acc, curr) => acc + curr.percent, 0); const color = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'][i % 5]; return `${color} 0 ${prevPercent + c.percent}%`; }).join(', ')})` }}>
                      <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center flex-col shadow-inner">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Expense</span>
                        <span className="text-lg font-black text-slate-800 mt-1">{categoryBreakdown[0]?.name || '-'}</span>
                        <span className="text-xs font-bold text-purple-500">{Math.round(categoryBreakdown[0]?.percent || 0)}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-48 h-48 rounded-full border-4 border-slate-100 border-dashed flex items-center justify-center text-slate-300 text-xs font-bold">No Data</div>
                  )}
                </div>
                <div className="space-y-3">
                  {categoryBreakdown.map((cat, i) => (
                    <div 
                      key={cat.name} 
                      className={`p-3 rounded-xl transition-all cursor-pointer flex justify-between items-center group ${focusedCategory === cat.name ? 'bg-slate-50 ring-2 ring-indigo-100' : 'hover:bg-slate-50'}`} 
                      onClick={() => setFocusedCategory(focusedCategory === cat.name ? null : cat.name)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'][i % 5] }}></div>
                        <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800 text-sm">${cat.value.toFixed(0)}</div>
                        <div className="text-[10px] font-bold text-slate-400">{Math.round(cat.percent)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'ai-tools' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              
              <Card className="p-6 border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30">
                <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800"><Bot size={20} className="text-emerald-500"/> AI Assistant</h2>
                
                {/* AI Actions Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button onClick={() => handleAnalyze('helpful')} disabled={isProcessingAI} className="bg-white border border-emerald-100 text-emerald-700 py-3 px-3 rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-50 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group">
                    <Brain size={16} className="group-hover:scale-110 transition-transform"/> Analyze
                  </button>
                  <button onClick={() => handleAnalyze('roast')} disabled={isProcessingAI} className="bg-white border border-orange-100 text-orange-700 py-3 px-3 rounded-xl text-xs font-bold shadow-sm hover:bg-orange-50 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group">
                    <Flame size={16} className="group-hover:scale-110 transition-transform"/> Roast Me
                  </button>
                  <button onClick={() => handleAnalyze('savings')} disabled={isProcessingAI} className="bg-white border border-teal-100 text-teal-700 py-3 px-3 rounded-xl text-xs font-bold shadow-sm hover:bg-teal-50 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group">
                    <PiggyBank size={16} className="group-hover:scale-110 transition-transform"/> Tips 💰
                  </button>
                  <button onClick={() => handleAnalyze('forecast')} disabled={isProcessingAI} className="bg-white border border-blue-100 text-blue-700 py-3 px-3 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-50 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group">
                    <TrendingUp size={16} className="group-hover:scale-110 transition-transform"/> Forecast 🔮
                  </button>
                </div>

                {isProcessingAI && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-emerald-500" size={32}/>
                  </div>
                )}

                {analysisResult && (
                  <div className={`p-5 rounded-2xl shadow-lg relative animate-in zoom-in duration-300 text-white ${getAIBoxColor()}`}>
                    <button onClick={() => setAnalysisResult(null)} className="absolute top-3 right-3 text-white/60 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1 transition-colors">
                      <X size={14} />
                    </button>
                    <div className="text-sm font-medium leading-relaxed opacity-95 whitespace-pre-wrap drop-shadow-sm">
                      {analysisResult}
                    </div>
                    <div className="absolute -bottom-4 -right-4 opacity-10 transform rotate-12">
                       <Sparkles size={80} />
                    </div>
                  </div>
                )}
              </Card>
              
              {/* Financial Report Card */}
              <Card className="p-6 bg-gradient-to-br from-white to-indigo-50 border-indigo-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-indigo-900">
                    <GraduationCap size={20} className="text-indigo-600"/> Financial Report Card
                  </h2>
                  <button onClick={handleReportCard} className="text-xs bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-sm">
                    Get Grade
                  </button>
                </div>
                {reportCard ? (
                   <div className="animate-in zoom-in duration-300 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3 border-b border-indigo-50 pb-2">
                        <div className="text-4xl font-black text-indigo-600">{reportCard.grade}</div>
                        <div className="text-right">
                           <div className="text-xs font-bold text-slate-400 uppercase">Score</div>
                           <div className="text-xl font-bold text-slate-800">{reportCard.score}/100</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 italic">"{reportCard.comment}"</p>
                   </div>
                ) : (
                   <div className="text-center py-6 text-indigo-300">
                     <GraduationCap size={40} className="mx-auto mb-2 opacity-20" />
                     <p className="text-xs font-medium text-indigo-400">How good are your habits?</p>
                   </div>
                )}
              </Card>

              {/* Tax Deduction Scout */}
              <Card className="p-6 bg-gradient-to-br from-white to-blue-50 border-blue-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-blue-900">
                    <FileText size={20} className="text-blue-600"/> Tax Deduction Scout
                  </h2>
                  <button onClick={handleTaxScout} className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-sm">
                    Scan
                  </button>
                </div>
                {taxDeductions ? (
                   taxDeductions.length > 0 ? (
                     <div className="space-y-2 animate-in slide-in-from-bottom-2">
                        {taxDeductions.map((item, i) => (
                           <div key={i} className="flex justify-between items-start p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
                              <div>
                                 <div className="font-bold text-slate-800 text-sm">{item.item}</div>
                                 <div className="text-xs text-blue-500 font-medium mt-0.5">{item.reason}</div>
                              </div>
                              <div className="font-bold text-blue-700 text-sm">${item.amount}</div>
                           </div>
                        ))}
                        <p className="text-[10px] text-slate-400 text-center mt-2 italic">Consult a tax pro. AI suggestions only.</p>
                     </div>
                   ) : <p className="text-sm text-slate-500 italic text-center py-2">No obvious deductions found.</p>
                ) : (
                   <div className="text-center py-6 text-blue-300">
                     <FileText size={40} className="mx-auto mb-2 opacity-20" />
                     <p className="text-xs font-medium text-blue-400">Find write-offs for your freelance work</p>
                   </div>
                )}
              </Card>

              {/* Purchase Advisor */}
              <Card className="p-6">
                 <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800"><ShoppingBag size={20} className="text-pink-500"/> Can I Afford This?</h2>
                 <div className="flex gap-2 mb-4">
                   <input type="text" value={advisorInput} onChange={e => setAdvisorInput(e.target.value)} placeholder="e.g. New Sneakers $120" className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 transition-all"/>
                   <button onClick={handlePurchaseAdvice} disabled={isProcessingAI} className="bg-pink-500 text-white px-4 rounded-xl hover:bg-pink-600 disabled:opacity-50 font-bold text-xs shadow-md shadow-pink-200 transition-all active:scale-95">Ask AI</button>
                 </div>
                 {advisorResult && (
                   <div className={`p-4 rounded-xl border-2 animate-in zoom-in duration-300 ${advisorResult.verdict === 'YES' ? 'bg-green-50 border-green-100 text-green-800' : advisorResult.verdict === 'NO' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-yellow-50 border-yellow-100 text-yellow-800'}`}>
                      <div className="flex items-center gap-2 font-black text-lg mb-2">{advisorResult.verdict === 'YES' ? <ThumbsUp size={20}/> : advisorResult.verdict === 'NO' ? <ThumbsDown size={20}/> : <HelpCircle size={20}/>}{advisorResult.verdict}</div><p className="text-sm font-medium leading-relaxed opacity-90">{advisorResult.reason}</p>
                   </div>
                 )}
              </Card>

              {/* Subscription Detective */}
              <Card className="p-6 bg-gradient-to-br from-white to-purple-50/50 border-purple-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-purple-900"><Repeat size={20} className="text-purple-600"/> Subscription Detective</h2>
                  <button onClick={handleFindSubscriptions} disabled={isProcessingAI} className="text-xs bg-white border border-purple-200 text-purple-600 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-50 transition-colors shadow-sm flex items-center gap-1">{isProcessingAI ? <Loader2 size={12} className="animate-spin"/> : 'Scan'}</button>
                </div>
                {subscriptions ? (
                  subscriptions.length > 0 ? (
                    <div className="space-y-3 animate-in slide-in-from-bottom-2">
                      {subscriptions.map((sub, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-purple-100 shadow-sm">
                          <div><div className="font-bold text-slate-800">{sub.name}</div><div className="text-xs text-purple-500 font-medium">{sub.frequency}</div></div>
                          <div className="font-bold text-purple-700">${sub.amount}</div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-slate-500 italic text-center py-2">No subscriptions found! 🎉</p>
                ) : (
                  <div className="text-center py-6 text-purple-300"><Repeat size={40} className="mx-auto mb-2 opacity-20" /><p className="text-xs font-medium text-purple-400">Tap scan to find recurring bills</p></div>
                )}
              </Card>

              {/* Opportunity Cost */}
              <Card className="p-6 bg-gradient-to-br from-teal-50 to-white border-teal-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-teal-900"><Gift size={20} className="text-teal-600"/> Opportunity Cost</h2>
                  <button onClick={handleOpportunityCost} className="text-xs bg-white border border-teal-200 text-teal-600 px-3 py-1.5 rounded-lg font-bold hover:bg-teal-50 transition-colors shadow-sm">Calculate</button>
                </div>
                {opportunityResult ? (
                  <div className="text-center py-2 animate-in zoom-in duration-300">
                    <div className="text-teal-800 font-medium text-sm mb-2">Instead of spending on your top category, you could buy:</div>
                    <div className="font-black text-xl text-teal-700 mb-1">{opportunityResult.item} ({opportunityResult.price})</div>
                    <p className="text-xs text-teal-600 italic">"{opportunityResult.message}"</p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-teal-300"><Gift size={40} className="mx-auto mb-2 opacity-20" /><p className="text-xs font-medium text-teal-400">See what else you could buy!</p></div>
                )}
              </Card>
              
              {/* Spending Persona */}
              <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-indigo-900"><User size={20} className="text-indigo-600"/> Spending Persona</h2>
                  <button onClick={handleGeneratePersona} className="text-xs bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-sm">Generate</button>
                </div>
                {personaResult ? (
                  <div className="text-center py-4 animate-in fade-in duration-500"><div className="text-4xl mb-3 animate-bounce">🧙‍♂️</div><h3 className="font-black text-indigo-800 text-xl mb-2">{personaResult.class}</h3><p className="text-sm text-indigo-600/80 italic px-4">"{personaResult.desc}"</p></div>
                ) : (
                  <div className="text-center py-8 text-indigo-300"><User size={48} className="mx-auto mb-2 opacity-20" /><p className="text-xs font-medium">Reveal your financial RPG class!</p></div>
                )}
              </Card>

            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-[calc(100vh-180px)] animate-in slide-in-from-right duration-300">
              <div className="flex-1 overflow-y-auto space-y-4 p-4 pb-2">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && (<div className="flex justify-start animate-in fade-in"><div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-bl-sm shadow-sm flex gap-2 items-center"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></div><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></div></div></div>)}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 fixed bottom-[70px] left-0 right-0 max-w-md mx-auto">
                <div className="flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Ask about your spending..." className="flex-1 px-5 py-3 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all focus:bg-white" />
                  <button onClick={handleChat} disabled={isChatLoading || !chatInput} className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all active:scale-90"><Send size={20} /></button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <Card className="p-6">
                <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800"><Settings size={22} className="text-slate-400"/> Configuration</h2>
                <div className="mb-8 space-y-5">
                  <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Google Apps Script URL</label><input type="text" value={scriptUrl} onChange={e => setScriptUrl(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"/></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gemini API Key</label><input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-medium transition-all"/></div>
                  <button onClick={handleSaveSettings} className="w-full py-3.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all hover:-translate-y-0.5">Save Configuration</button>
                </div>
                <div className="border-t pt-6 border-slate-100"><SetupGuide /></div>
              </Card>
              <div className="text-center pb-4"><button onClick={() => signOut(auth)} className="text-red-500 text-sm font-bold flex items-center justify-center gap-2 mx-auto hover:bg-red-50 px-6 py-3 rounded-xl transition-all"><LogOut size={18} /> Sign Out</button></div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Nav */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl shadow-indigo-500/10 rounded-2xl p-2 z-50 flex justify-around items-center">
        {['add', 'history', 'visualize', 'ai-tools', 'chat', 'settings'].map(t => {
          const isActive = activeTab === t;
          return (
            <button 
              key={t} 
              onClick={() => setActiveTab(t)} 
              className={`relative flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300 -translate-y-2' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              {t==='add'?<PlusCircle size={20}/>:t==='history'?<History size={20}/>:t==='visualize'?<BarChart3 size={20}/>:t==='ai-tools'?<Sparkles size={20}/>:t==='chat'?<MessageSquare size={20}/>:<Settings size={20}/>}
              {isActive && <span className="absolute -bottom-4 text-[8px] font-bold text-indigo-600 capitalize opacity-0 animate-in fade-in slide-in-from-top-1 duration-300 fill-mode-forwards delay-100" style={{ opacity: 1 }}>{t === 'ai-tools' ? 'AI Tools' : t}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
