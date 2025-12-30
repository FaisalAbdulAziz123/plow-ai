import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Copy, 
  Check, 
  Sparkles, 
  Aperture, 
  Zap, 
  Maximize,
  Languages,
  Braces,
  AlertCircle,
  Sun,
  Moon,
  Edit3,
  RefreshCw,
  RotateCcw
} from 'lucide-react';

// API Key injected by environment at runtime
const apiKey = process.env.REACT_APP_API_KEY; 

export default function AIPromptFinder() {
  const [activeTab, setActiveTab] = useState('video');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [language, setLanguage] = useState('id');
  const [copySuccess, setCopySuccess] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');
  // New States for Modification
  const [modificationQuery, setModificationQuery] = useState('');
  const [isModifying, setIsModifying] = useState(false);

  // KODE AKSES & API KEY
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('isAuthenticated');
    return saved === 'true';
  });
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState('');
  const VALID_CODE = 'PLOW2025'; // Ganti sesuai kebutuhan
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('apiKey') || '');
  const [apiKeyError, setApiKeyError] = useState('');

  // State untuk halaman pengaturan API Key
  const [showApiKeyPage, setShowApiKeyPage] = useState(false);

  // Hapus durasi panjang, hanya gunakan durasi pendek
  // const [durationType, setDurationType] = useState(() => localStorage.getItem('durationType') || 'short');

  // State untuk riwayat prompt
  const [promptHistory, setPromptHistory] = useState(() => {
    const saved = localStorage.getItem('promptHistory');
    return saved ? JSON.parse(saved) : [];
  });
  // State untuk menampilkan detail riwayat prompt
  const [historyDetail, setHistoryDetail] = useState(null);

  // Simpan status login ke localStorage
  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);
  // Simpan API key ke localStorage
  useEffect(() => {
    localStorage.setItem('apiKey', apiKey);
  }, [apiKey]);

  // Simpan riwayat prompt ke localStorage jika berubah
  useEffect(() => {
    localStorage.setItem('promptHistory', JSON.stringify(promptHistory));
  }, [promptHistory]);

  const fileInputRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const resetApp = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setGeneratedPrompt('');
    setModificationQuery('');
    setError(null);
    // We keep the active tab and language preferences
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('apiKey');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validation
    const isVideo = selectedFile.type.startsWith('video/');
    const isImage = selectedFile.type.startsWith('image/');

    if (activeTab === 'video' && !isVideo) {
      alert('Mohon unggah file video (MP4/WEBM).');
      return;
    }
    if (activeTab === 'image' && !isImage) {
      alert('Mohon unggah file gambar (JPG/PNG).');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      alert('Ukuran file maksimal 50MB.');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setGeneratedPrompt(''); // Reset previous result
    setModificationQuery('');
    setError(null);
  };

  const fileToGenerativePart = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;
        const base64Content = base64Data.split(',')[1];
        resolve({
          inlineData: {
            data: base64Content,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Hapus durasi panjang, hanya prompt pendek yang dioptimalkan
  const generatePrompt = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setGeneratedPrompt('');
    setModificationQuery('');
    setError(null);
    setAnalysisStep('Mempersiapkan data visual...');

    try {
      // 1. Convert File to Base64
      const imagePart = await fileToGenerativePart(file);

      // 2. System Prompt hanya untuk durasi pendek
      let systemInstruction = language === 'id' 
        ? `Anda adalah asisten AI vision dan audio yang sangat teliti. Analisis file yang diupload user (bisa gambar atau video) secara mendalam dan detail.\nTugas: Buat prompt text-to-image yang sangat akurat, berdasarkan isi visual file yang diupload user, bukan generik.\nOutfit karakter utama HARUS konsisten.\nBackground/set lokasi WAJIB konsisten.\nJika ada dialog, karakter utama berbicara dalam bahasa Indonesia (field \"dialog\").\nJuga buat deskripsi suara/soundtrack yang cocok dan sesuai tema visual.\nOutput WAJIB berupa JSON valid:\n{\n  \"prompt\": \"...deskripsi visual file user...\",\n  \"sound\": \"...deskripsi suara/soundtrack...\",\n  \"dialog\": \"...kalimat karakter utama dalam bahasa Indonesia (jika ada)...\"\n}\nSemua prompt, sound, outfit, background, dan dialog WAJIB berdasarkan isi file user, jangan generik.`
        : `You are a highly detailed vision and audio AI assistant. Analyze the uploaded file (image or video) deeply and accurately.\nTask: Create a highly accurate text-to-image prompt, based on the actual visual content of the uploaded file, not generic.\nThe main character's outfit MUST be consistent.\nBackground/set location MUST be consistent.\nIf there is dialog, the main character speaks in Indonesian (field \"dialog\").\nAlso provide a soundtrack/sound description that matches the visual theme.\nOutput MUST be valid JSON:\n{\n  \"prompt\": \"...describing user's file...\",\n  \"sound\": \"...soundtrack description...\",\n  \"dialog\": \"...main character dialog in Indonesian (if any)...\"\n}\nAll prompts, sounds, outfit, background, and dialog MUST be based on the user's file, not generic.`;

      setAnalysisStep('Menganalisis dengan Gemini Vision AI...');

      // 3. Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: systemInstruction },
                imagePart
              ]
            }],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (resultText) {
        try {
          const parsed = JSON.parse(resultText);
          setGeneratedPrompt(JSON.stringify(parsed, null, 2));
          // Tambahkan ke riwayat prompt
          setPromptHistory(prev => [
            {
              date: new Date().toISOString(),
              fileName: file.name,
              prompt: JSON.stringify(parsed, null, 2),
              fileType: file.type,
              fileUrl: previewUrl || URL.createObjectURL(file)
            },
            ...prev
          ]);
        } catch (e) {
          setGeneratedPrompt(resultText);
        }
      } else {
        throw new Error('Tidak ada respon data dari AI.');
      }

    } catch (err) {
      console.error(err);
      setError('Gagal menganalisis media. Pastikan koneksi internet lancar dan file tidak rusak.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const modifyPrompt = async () => {
    if (!generatedPrompt || !modificationQuery) return;

    setIsModifying(true);
    setError(null);

    try {
      const systemInstruction = language === 'id' 
        ? `Anda adalah asisten AI editor JSON.
           Tugas: Modifikasi nilai (values) dalam JSON prompt berikut sesuai permintaan pengguna.
           ATURAN KRUSIAL:
           1. JANGAN PERNAH mengubah nama kunci (keys) atau struktur JSON.
           2. HANYA ubah konten teks di dalam values.
           3. Output harus JSON valid murni.
           4. Sesuaikan prompt_final_optimized dengan perubahan yang diminta.`
        : `You are an AI JSON editor assistant.
           Task: Modify the values in the following JSON prompt based on the user's request.
           CRITICAL RULES:
           1. NEVER change the key names or JSON structure.
           2. ONLY change the text content within the values.
           3. Output must be pure valid JSON.
           4. Update prompt_final_optimized to reflect changes.`;

      const promptContent = `
      ORIGINAL JSON:
      ${generatedPrompt}

      USER MODIFICATION REQUEST:
      ${modificationQuery}
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: systemInstruction },
                { text: promptContent }
              ]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (resultText) {
        try {
          const parsedJSON = JSON.parse(resultText);
          setGeneratedPrompt(JSON.stringify(parsedJSON, null, 2));
        } catch (e) {
          setGeneratedPrompt(resultText);
        }
      }

    } catch (err) {
      setError('Gagal memodifikasi prompt. Coba lagi.');
    } finally {
      setIsModifying(false);
    }
  };

  const handleCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = generatedPrompt;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopySuccess(true);
    } catch (err) {
      console.error('Gagal menyalin text', err);
    }
    
    document.body.removeChild(textArea);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Theme-based Classes
  const isDark = theme === 'dark';
  
  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-900';
  const cardBgClass = isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBgClass = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-sm';
  const tabInactiveClass = isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600';
  const uploadBorderClass = isDark ? 'border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/30 bg-slate-900/30' : 'border-slate-300 hover:border-purple-500/50 hover:bg-slate-50 bg-white';
  const codeBlockBg = isDark ? 'bg-black/40 border-slate-700/50' : 'bg-slate-900 border-slate-800'; // Code block always dark for better readability
  
  // --- HALAMAN KODE AKSES & API KEY ---
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgClass}`}>
        <div className={`${cardBgClass} p-8 rounded-2xl shadow-xl w-full max-w-sm`}>
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Akses Masuk</h2>
            <p className={textMutedClass}>Masukkan kode akses untuk masuk ke aplikasi.</p>
          </div>
          {accessError && <div className="mb-4 text-red-500 text-sm">{accessError}</div>}
          <form onSubmit={e => {
            e.preventDefault();
            setAccessError('');
            if (!accessCode) {
              setAccessError('Kode akses wajib diisi!');
              return;
            }
            if (accessCode !== VALID_CODE) {
              setAccessError('Kode akses salah!');
              return;
            }
            setIsAuthenticated(true);
          }}>
            <input
              type="text"
              placeholder="Kode Akses"
              className={`mb-3 w-full px-4 py-2 rounded-lg border ${inputBgClass}`}
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
            />
            <button type="submit" className="w-full py-2 rounded-lg bg-purple-600 text-white font-bold mb-2">Masuk</button>
          </form>
        </div>
      </div>
    );
  }

  // --- HALAMAN UTAMA (HOME) ---
  if (showApiKeyPage) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgClass}`}>
        <div className={`${cardBgClass} p-8 rounded-2xl shadow-xl w-full max-w-sm`}>
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Atur API Key Gemini</h2>
            <p className={textMutedClass}>Masukkan API Key Gemini Anda untuk menggunakan aplikasi.</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); setApiKeyError(''); if (!apiKey) { setApiKeyError('API key wajib diisi!'); return; } setShowApiKeyPage(false); }}>
            <input
              type="text"
              placeholder="API Key Gemini"
              className={`mb-2 w-full px-4 py-2 rounded-lg border ${inputBgClass}`}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            {apiKeyError && <div className="mb-2 text-red-500 text-sm">{apiKeyError}</div>}
            <button type="submit" className="w-full py-2 rounded-lg bg-purple-600 text-white font-bold mb-2">Simpan API Key</button>
            <button type="button" className="w-full py-2 rounded-lg bg-slate-200 text-slate-700 font-bold" onClick={() => setShowApiKeyPage(false)}>Batal</button>
          </form>
        </div>
      </div>
    );
  }

  // Sidebar tanpa pengaturan durasi, tambahkan riwayat prompt
  return (
    <div className={`min-h-screen font-sans selection:bg-purple-500 selection:text-white flex flex-row relative overflow-hidden transition-colors duration-500 ${bgClass}`}>
      {/* Sidebar */}
      <aside className={`h-screen w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col p-6 fixed left-0 top-0 z-20 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xl`}> 
        <div className="flex items-center justify-between mb-8 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span className="text-lg font-bold text-white tracking-wide">PLOW-AI</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800/60">✕</button>
        </div>
        <div className="mb-6">
          <div className="text-xs text-slate-400 mb-2 font-semibold uppercase">Pengaturan</div>
          <button onClick={() => setShowApiKeyPage(true)} className="w-full py-2 rounded-lg bg-purple-600 text-white font-bold text-sm mb-2">Atur API Key</button>
          <div className="text-xs text-slate-400">{apiKey ? 'API Key sudah diatur' : 'API Key belum diatur'}</div>
        </div>
        {/* Riwayat Prompt */}
        <div className="mt-8 flex-1 overflow-y-auto">
          <div className="text-xs text-slate-400 mb-2 font-semibold uppercase">Riwayat Prompt</div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {promptHistory.length === 0 && (
              <div className="text-slate-500 text-xs">Belum ada riwayat prompt.</div>
            )}
            {promptHistory.map((item, idx) => (
              <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 mb-1">
                <div className="font-semibold text-purple-300 truncate">{item.fileName}</div>
                <div className="truncate text-slate-400">{item.prompt.slice(0, 60)}{item.prompt.length > 60 ? '...' : ''}</div>
                <div className="text-slate-500 text-[10px]">{new Date(item.date).toLocaleString('id-ID')}</div>
                {item.fileUrl && (
                  <div className="my-1">
                    {item.fileType && item.fileType.startsWith('image/') ? (
                      <img src={item.fileUrl} alt="preview" className="w-12 h-12 object-cover rounded border border-slate-700" />
                    ) : item.fileType && item.fileType.startsWith('video/') ? (
                      <video src={item.fileUrl} className="w-12 h-12 object-cover rounded border border-slate-700" />
                    ) : null}
                  </div>
                )}
                <button className="mt-1 text-blue-400 underline text-[10px]" onClick={() => setHistoryDetail(item)}>Lihat</button>
              </div>
            ))}
          </div>
        </div>
        {/* Button close moved to top */}
      </aside>
      {/* Sidebar Toggle Button */}
      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} className="fixed top-4 left-4 z-30 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg">☰</button>
      )}
      {/* Main Content */}
      <div className={`flex-1 ml-0 ${sidebarOpen ? 'sm:ml-64' : ''} transition-all duration-300`}>
        {/* Modal/Panel untuk detail riwayat prompt */}
        {historyDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-lg w-full relative">
              <button className="absolute top-2 right-2 text-slate-400 hover:text-white" onClick={() => setHistoryDetail(null)}>&times;</button>
              <div className="mb-2 text-xs text-slate-400">{new Date(historyDetail.date).toLocaleString('id-ID')}</div>
              <div className="font-bold text-purple-300 mb-2">{historyDetail.fileName}</div>
              {historyDetail.fileUrl && (
                <div className="mb-3">
                  {historyDetail.fileType && historyDetail.fileType.startsWith('image/') ? (
                    <img src={historyDetail.fileUrl} alt="preview" className="w-full max-h-48 object-contain rounded border border-slate-700 mx-auto" />
                  ) : historyDetail.fileType && historyDetail.fileType.startsWith('video/') ? (
                    <video src={historyDetail.fileUrl} controls className="w-full max-h-48 object-contain rounded border border-slate-700 mx-auto" />
                  ) : null}
                </div>
              )}
              <div className="mb-2 text-xs text-slate-400">Prompt JSON:</div>
              <pre className="bg-black/40 border border-slate-700/50 rounded-xl p-4 text-green-400 text-xs max-h-64 overflow-auto whitespace-pre-wrap">{historyDetail.prompt}</pre>
              <button className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs" onClick={() => {
                setGeneratedPrompt(historyDetail.prompt);
                if (historyDetail.fileUrl && historyDetail.fileType) {
                  setPreviewUrl(historyDetail.fileUrl);
                  setFile({ name: historyDetail.fileName, type: historyDetail.fileType });
                }
                setHistoryDetail(null);
              }}>Gunakan Prompt Ini</button>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="text-center space-y-2 relative">
           {/* Header Actions - Absolute Position */}
           <div className="absolute right-0 top-0 sm:-right-14 sm:top-1 flex sm:flex-col gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 ${isDark ? 'bg-slate-800 text-yellow-300 hover:bg-slate-700' : 'bg-white text-orange-500 shadow-md hover:bg-gray-100'}`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={resetApp}
              className={`p-2 rounded-full transition-all duration-300 ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-white text-slate-400 hover:text-slate-600 shadow-md hover:bg-gray-100'}`}
              title="Reset / Refresh App"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          <div className={`inline-flex items-center justify-center p-2 rounded-full border mb-2 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200'}`}>
            <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
            <span className={`text-xs font-medium tracking-wider ${textMutedClass}`}>REAL-TIME AI VISION</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 tracking-tight">
            PLOW-AI prompt
          </h1>
          <p className={`${textMutedClass} text-lg`}>
            Analisis foto/video & hasilkan prompt JSON yang akurat.
          </p>
        </div>

        {/* Main Card */}
        <div className={`${cardBgClass} backdrop-blur-xl border rounded-3xl shadow-2xl overflow-hidden transition-colors duration-300`}>
          
          {/* Tabs */}
          <div className={`flex border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <button 
              onClick={() => { setActiveTab('image'); setFile(null); setPreviewUrl(null); setGeneratedPrompt(''); setModificationQuery(''); setError(null); }}
              className={`flex-1 py-4 flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'image' ? `bg-opacity-50 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} text-purple-500 border-b-2 border-purple-500` : tabInactiveClass}`}
            >
              <ImageIcon className="w-5 h-5" />
              <span className="font-medium">Gambar</span>
            </button>
            <button 
              onClick={() => { setActiveTab('video'); setFile(null); setPreviewUrl(null); setGeneratedPrompt(''); setModificationQuery(''); setError(null); }}
              className={`flex-1 py-4 flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'video' ? `bg-opacity-50 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} text-blue-500 border-b-2 border-blue-500` : tabInactiveClass}`}
            >
              <Video className="w-5 h-5" />
              <span className="font-medium">Video</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Upload Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all duration-300 h-64 flex flex-col items-center justify-center overflow-hidden
                ${file 
                  ? `${isDark ? 'border-slate-700 bg-black/40' : 'border-slate-300 bg-gray-100'}` 
                  : uploadBorderClass
                }
              `}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept={activeTab === 'video' ? "video/mp4,video/webm" : "image/png,image/jpeg"}
                onChange={handleFileChange}
              />
              
              {previewUrl ? (
                <div className="w-full h-full relative flex items-center justify-center">
                  {activeTab === 'video' ? (
                    <video src={previewUrl} className="max-h-full max-w-full rounded-lg shadow-lg" controls />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="max-h-full max-w-full rounded-lg shadow-lg object-contain" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                     <div className="bg-slate-800 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                        <Upload className="w-4 h-4" /> Ganti File
                     </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 transition-transform duration-300 group-hover:scale-105">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${activeTab === 'video' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                    {activeTab === 'video' ? <Video className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                  </div>
                  <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    Klik untuk mengunggah {activeTab === 'video' ? 'Video' : 'Gambar'}
                  </h3>
                  <p className={`text-sm ${textMutedClass}`}>
                    {activeTab === 'video' ? 'MP4, WEBM maksimal 50MB' : 'JPG, PNG kualitas tinggi'}
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              
              {/* Language Selector */}
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Languages className={`h-4 w-4 ${textMutedClass}`} />
                </div>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none cursor-pointer transition-colors ${inputBgClass}`}
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English (International)</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                   <svg className={`w-4 h-4 ${textMutedClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={generatePrompt}
                disabled={!file || isAnalyzing}
                className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-white shadow-lg shadow-purple-900/20 transition-all transform active:scale-95
                  ${!file 
                    ? `bg-opacity-50 ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed` 
                    : isAnalyzing 
                      ? 'bg-slate-800 cursor-wait'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-purple-500/25'
                  }
                `}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{analysisStep}</span>
                  </>
                ) : (
                  <>
                    <Zap className={`w-5 h-5 ${file ? 'text-yellow-300 fill-yellow-300' : ''}`} />
                    HASILKAN PROMPT
                  </>
                )}
              </button>
            </div>

            {/* Result Area */}
            {generatedPrompt && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold tracking-wide uppercase">
                    <Braces className="w-4 h-4" /> JSON Output
                  </div>
                  <button 
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border ${copySuccess ? 'bg-green-500/10 text-green-500 border-green-500/20' : `${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-gray-50'}`}`}
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copySuccess ? 'Tersalin!' : 'Salin JSON'}
                  </button>
                </div>
                
                <div className={`${codeBlockBg} border rounded-xl p-4 sm:p-5 relative group overflow-hidden transition-colors`}>
                  <pre 
                    className="w-full bg-transparent border-none focus:ring-0 text-green-400 text-xs sm:text-sm leading-relaxed h-64 sm:h-80 font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent overflow-auto whitespace-pre-wrap"
                  >
                    {generatedPrompt}
                  </pre>
                  
                  {/* Decorative corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-purple-500/30 rounded-tl-lg group-hover:border-purple-500 transition-colors"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-500/30 rounded-br-lg group-hover:border-purple-500 transition-colors"></div>
                </div>

                {/* Modification Panel */}
                <div className={`p-4 rounded-xl border transition-colors ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                   <div className="flex items-center gap-2 mb-3">
                      <Edit3 className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                      <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Modifikasi Prompt</h3>
                   </div>
                   
                   <div className="flex flex-col gap-3">
                      <input 
                        type="text" 
                        value={modificationQuery}
                        onChange={(e) => setModificationQuery(e.target.value)}
                        placeholder="Contoh: Ubah suasana menjadi cyberpunk, ganti warna baju jadi merah..."
                        className={`w-full px-4 py-2.5 rounded-lg text-sm outline-none border transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${inputBgClass}`}
                        onKeyDown={(e) => e.key === 'Enter' && modifyPrompt()}
                      />
                      <button 
                        onClick={modifyPrompt}
                        disabled={!modificationQuery || isModifying}
                        className={`self-end flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all
                          ${!modificationQuery 
                             ? 'bg-slate-500/20 text-slate-500 cursor-not-allowed'
                             : isModifying
                               ? 'bg-blue-600/50 cursor-wait'
                               : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20'
                          }
                        `}
                      >
                         {isModifying ? (
                           <>
                             <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                             Memproses...
                           </>
                         ) : (
                           <>
                             Modifikasi
                             <Sparkles className="w-3.5 h-3.5" />
                           </>
                         )}
                      </button>
                   </div>
                   <p className={`mt-2 text-[10px] ${textMutedClass}`}>
                     *Fitur ini akan mengubah nilai JSON tanpa merusak struktur formatnya.
                   </p>
                </div>
              </div>
            )}

          </div>
        </div>
        
        {/* Footer */}
        <div className={`text-center text-xs ${textMutedClass}`}>
          <p>PLOW-AI prompt. Powered by Gemini Vision.</p>
        </div>

      </div>
    </div>
  );
}