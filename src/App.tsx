import { useState, FormEvent, useEffect, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Youtube, 
  Instagram, 
  Smartphone, 
  Link as LinkIcon, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Github,
  Video,
  Music,
  ExternalLink,
  History,
  Trash2,
  Clock,
  Play,
  Copy,
  Info,
  HelpCircle,
  Share2,
  XCircle,
  Pause,
  PlayCircle,
  FileVideo,
  UploadCloud,
  Scissors,
  Layers,
  Sparkles
} from 'lucide-react';

interface VideoFormat {
  qualityLabel: string;
  url: string;
  container: string;
  type: 'video' | 'audio';
}

interface VideoInfo {
  platform: string;
  title: string;
  thumbnail: string;
  downloadUrl: string;
  formats?: VideoFormat[];
  filename: string;
}

interface HistoryItem {
  id: string;
  title: string;
  thumbnail: string;
  platform: string;
  quality: string;
  timestamp: number;
  originalUrl?: string;
}

interface ActiveDownload {
  id: string;
  filename: string;
  totalSize: number;
  downloadedSize: number;
  status: 'downloading' | 'paused' | 'completed' | 'error';
  url: string;
  blobParts: Blob[];
  abortController: AbortController | null;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('snapfetch_history');
    if (savedHistory) {
      try {
        setHistoryItems(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Save history when it changes
  useEffect(() => {
    localStorage.setItem('snapfetch_history', JSON.stringify(historyItems));
  }, [historyItems]);

  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');
  const [activeDownload, setActiveDownload] = useState<ActiveDownload | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  
  // New Watermark removal state
  const [activeSection, setActiveSection] = useState<'downloader' | 'watermark'>('downloader');
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ filename: string; path: string; originalName: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processedVideo, setProcessedVideo] = useState<{ filename: string; downloadUrl: string } | null>(null);
  const [watermarkArea, setWatermarkArea] = useState({ x: 10, y: 10, width: 200, height: 100 });

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const copyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFetch = async (e?: FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const finalUrl = customUrl || url;
    if (!finalUrl) return;
    if (customUrl) setUrl(customUrl);

    setLoading(true);
    setError(null);
    setVideoInfo(null);
    setSelectedFormat(null);
    setShowPreview(false);

    try {
      const response = await fetch(`/api/info?url=${encodeURIComponent(finalUrl)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar o vídeo');
      }

      setVideoInfo(data);
      if (data.formats && data.formats.length > 0) {
        // Prefer 720p or highest video by default
        const defaultFormat = data.formats.find((f: VideoFormat) => f.qualityLabel === '720p' && f.type === 'video') || 
                             data.formats.find((f: VideoFormat) => f.type === 'video') || 
                             data.formats[0];
        setSelectedFormat(defaultFormat);
        setActiveTab(defaultFormat.type);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = (info: VideoInfo, format: VideoFormat | null) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      title: info.title,
      thumbnail: info.thumbnail,
      platform: info.platform,
      quality: format?.qualityLabel || 'HD',
      timestamp: Date.now(),
      originalUrl: url // Store original URL to re-fetch
    };
    
    setHistoryItems(prev => [newItem, ...prev.filter(item => item.title !== info.title).slice(0, 19)]); 
  };

  const removeFromHistory = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setHistoryItems(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    setHistoryItems([]);
    setConfirmClear(false);
    showToast('Histórico limpo com sucesso.');
  };

  const downloadProjectInfo = async () => {
    try {
      const response = await fetch('/PROJECT_INFO.md');
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PROJECT_INFO.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Informações do projeto baixadas.');
    } catch (err) {
      showToast('Erro ao baixar informações.');
    }
  };

  const downloadSourceCode = () => {
    const a = document.createElement('a');
    a.href = '/api/download-source';
    a.download = 'snapfetch_source.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Código fonte está sendo baixado...');
  };

  const shareContent = async (text: string, shareUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Download via SnapFetch',
          text: text,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      copyLink(shareUrl, 'current');
    }
  };

  const startDownload = async (downloadUrl: string, filename: string) => {
    // Reset previous download if any
    if (activeDownload && activeDownload.status === 'downloading') {
      activeDownload.abortController?.abort();
    }

    const controller = new AbortController();
    const newDownload: ActiveDownload = {
      id: Date.now().toString(),
      filename,
      totalSize: 0,
      downloadedSize: 0,
      status: 'downloading',
      url: downloadUrl,
      blobParts: [],
      abortController: controller
    };

    setActiveDownload(newDownload);
    await processDownload(newDownload, controller);
  };

  const processDownload = async (download: ActiveDownload, controller: AbortController) => {
    try {
      const response = await fetch(`/api/proxy-download?url=${encodeURIComponent(download.url)}&filename=${encodeURIComponent(download.filename)}`, {
        signal: controller.signal,
        headers: download.downloadedSize > 0 ? { 'Range': `bytes=${download.downloadedSize}-` } : {}
      });

      if (!response.ok && response.status !== 206) {
        throw new Error('Falha ao iniciar download');
      }

      // Total size known from headers
      if (download.totalSize === 0) {
        const contentLength = response.headers.get('content-length');
        const contentRange = response.headers.get('content-range');
        let total = 0;
        
        if (contentRange) {
          total = parseInt(contentRange.split('/')[1], 10);
        } else if (contentLength) {
          total = parseInt(contentLength, 10);
        }

        if (total > 0) {
          download.totalSize = total;
          setActiveDownload(prev => prev ? { ...prev, totalSize: total } : null);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Não foi possível ler o stream de dados');

      let receivedLength = download.downloadedSize;
      const chunks = [...download.blobParts];
      let lastUpdate = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = download.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          
          setActiveDownload(prev => prev ? { 
            ...prev, 
            status: 'completed', 
            downloadedSize: receivedLength,
            blobParts: chunks 
          } : null);
          showToast('Download concluído!');
          
          // Auto clear after 5 seconds
          setTimeout(() => {
            setActiveDownload(prev => prev?.status === 'completed' ? null : prev);
          }, 5000);
          break;
        }

        chunks.push(new Blob([value]));
        receivedLength += value.length;

        // Update progress state (throttled updates to avoid excessive re-renders)
        const now = Date.now();
        if (now - lastUpdate > 100 || receivedLength === download.totalSize) {
          setActiveDownload(prev => prev ? { 
            ...prev, 
            downloadedSize: receivedLength,
            blobParts: chunks 
          } : null);
          lastUpdate = now;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Download pausado ou cancelado');
      } else {
        console.error('Download error:', err);
        setActiveDownload(prev => prev ? { ...prev, status: 'error' } : null);
        showToast('Erro no download: ' + err.message);
      }
    }
  };

  const pauseDownload = () => {
    if (activeDownload && activeDownload.status === 'downloading') {
      activeDownload.abortController?.abort();
      setActiveDownload(prev => prev ? { ...prev, status: 'paused', abortController: null } : null);
    }
  };

  const resumeDownload = async () => {
    if (activeDownload && activeDownload.status === 'paused') {
      const controller = new AbortController();
      const updatedDownload = { ...activeDownload, status: 'downloading' as const, abortController: controller };
      setActiveDownload(updatedDownload);
      await processDownload(updatedDownload, controller);
    }
  };

  const cancelDownload = () => {
    if (activeDownload) {
      activeDownload.abortController?.abort();
      setActiveDownload(null);
      showToast('Download cancelado');
    }
  };

  const handleDownload = () => {
    if (!videoInfo) return;
    const format = selectedFormat;
    const downloadUrl = format ? format.url : videoInfo.downloadUrl;
    const extension = format?.type === 'audio' ? format.container : 'mp4';
    const filename = `${videoInfo.filename}.${extension}`;
    
    addToHistory(videoInfo, format);
    startDownload(downloadUrl, filename);
  };

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SnapFetch - Downloader de Redes Sociais',
          text: 'Baixe vídeos do YouTube, Instagram e TikTok facilmente!',
          url: window.location.href
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      copyLink(window.location.href, 'app-share');
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro no upload');
      setUploadedFile(data);
      showToast('Vídeo enviado com sucesso!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveWatermark = async () => {
    if (!uploadedFile) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/remove-watermark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadedFile.filename,
          area: watermarkArea
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro no processamento');
      setProcessedVideo(data);
      showToast('Marca d\'água removida com sucesso!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[140px] animate-pulse-slow" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[30%] left-[40%] w-[20%] h-[20%] bg-white/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col items-center mb-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20"
          >
            <Download className="text-white w-8 h-8" />
          </motion.div>
          <motion.h1 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl font-bold tracking-tight mb-2 text-center"
          >
            SnapFetch
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-center"
          >
            Sua ferramenta completa para mídias sociais.
          </motion.p>

          {/* Section Switcher */}
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 mt-8 w-full max-w-sm">
            <button 
              onClick={() => setActiveSection('downloader')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === 'downloader' 
                  ? 'bg-white text-black shadow-lg shadow-white/5' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Download className="w-4 h-4" /> Downloader
            </button>
            <button 
              onClick={() => setActiveSection('watermark')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === 'watermark' 
                  ? 'bg-white text-black shadow-lg shadow-white/5' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Scissors className="w-4 h-4" /> Marca d'água
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeSection === 'downloader' ? (
            <motion.div
              key="downloader"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
          <div className="bg-[#151619] border border-white/5 p-2 rounded-2xl shadow-2xl flex items-center group focus-within:border-purple-500/50 transition-colors">
            <form onSubmit={handleFetch} className="flex w-full overflow-hidden items-center px-3">
              <LinkIcon className="text-gray-500 w-5 h-5 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Cole o link do vídeo aqui..."
                className="w-full bg-transparent border-none focus:outline-none px-4 py-4 text-gray-200 placeholder:text-gray-600"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <div className="flex items-center gap-1 sm:gap-2 mr-2">
                {url && (
                  <button 
                    type="button"
                    onClick={() => { setUrl(''); setError(null); }}
                    className="p-3 text-gray-500 hover:text-white transition-colors"
                    title="Limpar link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={pasteFromClipboard}
                  className="p-3 text-gray-500 hover:text-white transition-colors hidden sm:block"
                  title="Colar da área de transferência"
                >
                  <Smartphone className="w-5 h-5" />
                </button>
                <button 
                  type="submit"
                  disabled={loading || !url}
                  className="bg-white text-black font-semibold px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analisar"}
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {['YouTube', 'Instagram', 'TikTok', 'Facebook', 'Shorts', 'Reels'].map((platform) => (
              <span key={platform} className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 hover:bg-white/10 transition-all cursor-default">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                {platform}
              </span>
            ))}
          </div>
        </motion.div>
          ) : (
            <motion.div
              key="watermark"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-[#151619] border border-white/5 p-8 rounded-3xl shadow-2xl text-center space-y-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent pointer-events-none" />
                
                {!uploadedFile ? (
                  <div className="space-y-6 relative z-10">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 group-hover:scale-110 transition-transform duration-500">
                      <UploadCloud className="w-10 h-10 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Remover Marca d'água de Vídeo</h3>
                      <p className="text-gray-400 text-sm max-w-xs mx-auto">
                        Envie um vídeo do seu dispositivo para remover marcas d'água usando IA.
                      </p>
                    </div>
                    
                    <label className="block">
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <div className="bg-white text-black font-bold px-8 py-4 rounded-2xl cursor-pointer hover:bg-gray-200 transition-all active:scale-95 inline-flex items-center gap-2">
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileVideo className="w-5 h-5" />}
                        {uploading ? "Enviando..." : "Selecionar Vídeo"}
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-6 relative z-10 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Vídeo Carregado</p>
                          <h4 className="font-bold truncate max-w-[200px]">{uploadedFile.originalName}</h4>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setUploadedFile(null); setProcessedVideo(null); }}
                        className="text-xs font-bold text-gray-500 hover:text-white transition-colors"
                      >
                        Trocar Vídeo
                      </button>
                    </div>

                    {!processedVideo ? (
                      <div className="space-y-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Layers className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-bold">Configurações de Remoção</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-gray-500">Posição X</label>
                              <input 
                                type="number" 
                                value={watermarkArea.x} 
                                onChange={(e) => setWatermarkArea({...watermarkArea, x: parseInt(e.target.value)})}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-gray-500">Posição Y</label>
                              <input 
                                type="number" 
                                value={watermarkArea.y} 
                                onChange={(e) => setWatermarkArea({...watermarkArea, y: parseInt(e.target.value)})}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-500">
                            Dica: Para a maioria dos vídeos do TikTok, a marca d'água fica no canto superior esquerdo ou inferior direito.
                          </p>
                        </div>

                        <button 
                          onClick={handleRemoveWatermark}
                          disabled={processing}
                          className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-purple-500/20 disabled:opacity-50"
                        >
                          {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          {processing ? "Processando vídeo..." : "Remover Marca d'água"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-green-400" />
                          <p className="text-sm text-green-200">Seu vídeo está pronto e sem marca d'água!</p>
                        </div>
                        
                        <a 
                          href={processedVideo.downloadUrl}
                          download={processedVideo.filename}
                          className="w-full h-14 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg"
                        >
                          <Download className="w-5 h-5" />
                          Baixar Vídeo Limpo
                        </a>

                        <button 
                          onClick={() => setProcessedVideo(null)}
                          className="w-full text-xs font-bold text-gray-500 hover:text-white transition-colors text-center"
                        >
                          Processar novamente com outra área
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/5 p-6 rounded-3xl flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">Como funciona?</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Nossa tecnologia de IA analisa o vídeo e aplica um filtro inteligente (Delogo) na área selecionada. 
                    Para melhores resultados, ajuste as coordenadas X e Y para cobrir exatamente a marca d'água.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Download Manager */}
        <AnimatePresence>
          {activeDownload && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-8 bg-[#151619] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Progress Bar Background */}
              <div className="absolute bottom-0 left-0 h-1 bg-purple-500/20 w-full" />
              <motion.div 
                className="absolute bottom-0 left-0 h-1 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                initial={{ width: 0 }}
                animate={{ width: `${(activeDownload.downloadedSize / (activeDownload.totalSize || 1)) * 100}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
              />

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0">
                   {activeDownload.status === 'downloading' ? (
                     <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                   ) : activeDownload.status === 'completed' ? (
                     <CheckCircle2 className="w-6 h-6 text-green-500" />
                   ) : activeDownload.status === 'paused' ? (
                     <Pause className="w-6 h-6 text-yellow-500" />
                   ) : (
                     <AlertCircle className="w-6 h-6 text-red-500" />
                   )}
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-sm truncate pr-2">{activeDownload.filename}</h3>
                    <span className="text-[10px] font-mono text-gray-500">
                      {Math.round((activeDownload.downloadedSize / (activeDownload.totalSize || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500 lowercase tracking-wider">
                      {(activeDownload.downloadedSize / (1024 * 1024)).toFixed(1)}MB / 
                      {activeDownload.totalSize ? ` ${(activeDownload.totalSize / (1024 * 1024)).toFixed(1)}MB` : ' ?'}
                    </p>
                    <div className="flex items-center gap-2">
                       {activeDownload.status === 'downloading' && (
                         <button 
                           onClick={pauseDownload}
                           className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                           title="Pausar"
                         >
                           <Pause className="w-4 h-4" />
                         </button>
                       )}
                       {activeDownload.status === 'paused' && (
                         <button 
                           onClick={resumeDownload}
                           className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                           title="Retomar"
                         >
                           <PlayCircle className="w-4 h-4" />
                         </button>
                       )}
                       {activeDownload.status !== 'completed' && (
                         <button 
                            onClick={cancelDownload}
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                            title="Cancelar"
                         >
                           <XCircle className="w-4 h-4" />
                         </button>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Messages */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Card */}
        <AnimatePresence>
          {videoInfo && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-8 bg-[#151619] border border-white/5 rounded-3xl overflow-hidden"
            >
              <div className="aspect-video relative group">
                {!showPreview ? (
                  <>
                    <img 
                      src={videoInfo.thumbnail} 
                      alt={videoInfo.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#151619] via-transparent to-transparent opacity-60" />
                    <button 
                      onClick={() => setShowPreview(true)}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:scale-110 active:scale-95 transition-all group/play"
                    >
                      <Play className="w-8 h-8 fill-current" />
                    </button>
                  </>
                ) : (
                  <video 
                    src={selectedFormat?.url || videoInfo.downloadUrl} 
                    controls 
                    autoPlay 
                    className="w-full h-full bg-black"
                  />
                )}
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                   <div className="bg-purple-500 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded inline-block mb-2">
                    {videoInfo.platform}
                   </div>
                   <h3 className="text-xl font-bold line-clamp-2 drop-shadow-lg">{videoInfo.title}</h3>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {videoInfo.formats && videoInfo.formats.length > 0 ? (
                  <div className="space-y-6">
                    {/* Mode Toggle (Tabs) */}
                    <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
                      <button 
                        onClick={() => setActiveTab('video')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                          activeTab === 'video' 
                            ? 'bg-white text-black shadow-lg shadow-white/5' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        <Video className="w-4 h-4" /> Vídeo
                      </button>
                      <button 
                        onClick={() => setActiveTab('audio')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                          activeTab === 'audio' 
                            ? 'bg-white text-black shadow-lg shadow-white/5' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                         <Music className="w-4 h-4" /> Áudio
                      </button>
                    </div>

                    {/* Formats List */}
                    <div className="space-y-2.5">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 5 }}
                          className="space-y-2"
                        >
                          {videoInfo.formats
                            .filter(f => f.type === activeTab)
                            .map((format, idx) => (
                              <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={format.qualityLabel + format.type}
                                onClick={() => setSelectedFormat(format)}
                                className={`w-full px-5 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group/item relative overflow-hidden ${
                                  selectedFormat?.qualityLabel === format.qualityLabel && selectedFormat?.type === activeTab
                                    ? 'text-white'
                                    : 'text-gray-400 hover:text-gray-200'
                                }`}
                              >
                                {/* Background Layer */}
                                <div className={`absolute inset-0 transition-all duration-300 ${
                                  selectedFormat?.qualityLabel === format.qualityLabel && selectedFormat?.type === activeTab
                                    ? 'bg-purple-600/10 border border-purple-500/40 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]'
                                    : 'bg-white/[0.03] border border-white/5 group-hover/item:border-white/10 group-hover/item:bg-white/[0.05]'
                                }`} />

                                <div className="flex items-center gap-4 relative z-10">
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                    selectedFormat?.qualityLabel === format.qualityLabel && selectedFormat?.type === activeTab
                                      ? 'border-purple-500 bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                                      : 'border-white/10 group-hover/item:border-white/20'
                                  }`}>
                                    {selectedFormat?.qualityLabel === format.qualityLabel && selectedFormat?.type === activeTab && (
                                      <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-2.5 h-2.5 bg-white rounded-full" 
                                      />
                                    )}
                                  </div>
                                  <span className="font-bold tracking-tight">{format.qualityLabel}</span>
                                </div>
                                
                                <div className="relative z-10 flex items-center gap-2">
                                  <span className={`text-[10px] uppercase tracking-[0.1em] font-mono px-2 py-1 rounded-lg transition-colors ${
                                    selectedFormat?.qualityLabel === format.qualityLabel && selectedFormat?.type === activeTab
                                      ? 'bg-purple-500/20 text-purple-200'
                                      : 'bg-white/5 text-gray-500'
                                  }`}>
                                    {format.container}
                                  </span>
                                </div>
                              </motion.button>
                            ))}
                        </motion.div>
                      </AnimatePresence>

                      {videoInfo.formats.filter(f => f.type === activeTab).length === 0 && (
                        <div className="py-12 text-center text-gray-600 text-sm font-medium border border-dashed border-white/5 rounded-3xl">
                          Nenhum formato de {activeTab === 'video' ? 'vídeo' : 'áudio'} disponível.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium py-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Pronto para download (HD 720p)
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDownload}
                      className={`flex-grow h-14 bg-gradient-to-r font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg ${
                        selectedFormat?.type === 'audio'
                          ? 'from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-blue-500/20'
                          : 'from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 shadow-purple-500/20'
                      }`}
                    >
                      <Download className="w-5 h-5" />
                      {selectedFormat?.type === 'audio' 
                        ? `Baixar Áudio (${selectedFormat.container})` 
                        : `Baixar Vídeo (${selectedFormat?.qualityLabel || 'MP4'})`}
                    </button>
                    <button 
                      onClick={() => copyLink(selectedFormat?.url || videoInfo.downloadUrl, 'current')}
                      className="w-14 h-14 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all group/copy"
                      title="Copiar Link de Download"
                    >
                      {copiedId === 'current' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-500 group-hover/copy:text-gray-300" />}
                    </button>
                    <button 
                      onClick={() => shareContent(videoInfo.title, selectedFormat?.url || videoInfo.downloadUrl)}
                      className="w-14 h-14 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all group/share"
                      title="Compartilhar Link"
                    >
                      <Share2 className="w-5 h-5 text-gray-500 group-hover/share:text-gray-300" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setVideoInfo(null)}
                    className="w-full h-12 bg-white/5 hover:bg-white/10 text-gray-400 font-medium text-sm rounded-2xl flex items-center justify-center transition-all"
                  >
                    Analisar Outro Vídeo
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-purple-500" />
              Histórico Recente
            </h2>
            {historyItems.length > 0 && (
              <div className="flex items-center gap-4">
                {confirmClear ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={clearHistory}
                      className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-[0.2em] bg-red-500/10 px-2 py-1 rounded-lg"
                    >
                      Confirmar?
                    </button>
                    <button 
                      onClick={() => setConfirmClear(false)}
                      className="text-[10px] font-bold text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-[0.2em]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmClear(true)}
                    className="text-[10px] font-bold text-gray-500 hover:text-red-400 transition-colors uppercase tracking-[0.2em] flex items-center gap-1.5 group/clear"
                  >
                    <Trash2 className="w-3 h-3 transition-transform group-hover/clear:scale-110" /> Limpar Tudo
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {historyItems.length > 0 ? (
              historyItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleFetch(undefined, (item as any).originalUrl)}
                  className="bg-[#151619] border border-white/5 rounded-2xl p-3 flex items-center gap-4 hover:border-white/10 transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-sm truncate pr-4">{item.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">{item.quality}</span>
                      <span className="text-purple-400">{item.platform}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        copyLink((item as any).originalUrl || '', item.id); 
                      }}
                      className="p-2 text-gray-600 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Copiar Link Original"
                    >
                      {copiedId === item.id ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={(e) => removeFromHistory(item.id, e)}
                      className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 border border-dashed border-white/5 rounded-3xl text-center">
                <p className="text-gray-600 text-xs italic">Você ainda não baixou nenhum vídeo. Seu histórico aparecerá aqui.</p>
              </div>
            )}
          </div>

          {/* Project Info & Source Shortcut */}
          <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={downloadProjectInfo}
                className="py-3 px-4 rounded-xl bg-purple-600/5 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-purple-600/10 transition-all flex items-center justify-center gap-2 group"
              >
                <Download className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
                Baixar Info
              </button>
              <button 
                onClick={downloadSourceCode}
                className="py-3 px-4 rounded-xl bg-blue-600/5 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-600/10 transition-all flex items-center justify-center gap-2 group"
              >
                <Download className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
                Baixar Código
              </button>
            </div>
            <p className="text-[9px] text-gray-600 text-center uppercase tracking-widest leading-relaxed">
              O código inclui arquivos .ts e .tsx principais do aplicativo.
            </p>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-20 space-y-8"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Dúvidas Frequentes</h2>
            <p className="text-gray-500 text-sm">Tudo o que você precisa saber sobre o SnapFetch</p>
          </div>

          <div className="grid grid-cols-1 gap-4 text-left">
            {[
              { q: 'É gratuito?', a: 'Sim, você pode baixar quantos vídeos quiser sem custo algum.' },
              { q: 'Funciona com links privados?', a: 'Não, o vídeo precisa estar configurado como Público na plataforma original.' },
              { q: 'Tem marca d\'água?', a: 'Não! Nossos downloads do TikTok são processados para remover a marca d\'água.' },
              { q: 'Onde ficam os arquivos?', a: 'Os downloads vão diretamente para a pasta de downloads padrão do seu navegador/celular.' }
            ].map((faq, i) => (
              <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                <h4 className="font-bold text-gray-200 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-500" /> {faq.q}
                </h4>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Share Section */}
        <div className="mt-12 text-center">
           <button 
            onClick={shareApp}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-3 mx-auto"
           >
            <Share2 className="w-4 h-4" /> 
            {copiedId === 'app-share' ? 'Link Copiado!' : 'Compartilhar App'}
           </button>
        </div>

        {/* Info Area */}
        <footer className="mt-20 text-center border-t border-white/5 pt-10">
          <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto mb-6">
            SnapFetch é uma ferramenta educativa. Certifique-se de respeitar os direitos autorais e as políticas das plataformas ao baixar conteúdos.
          </p>
          <div className="flex justify-center gap-4 text-gray-600">
             <a href="#" className="hover:text-white transition-colors"><Github className="w-4 h-4" /></a>
             <a href="#" className="hover:text-white transition-colors text-xs font-medium uppercase tracking-widest flex items-center gap-1">API <ExternalLink className="w-3 h-3" /></a>
          </div>
        </footer>
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold text-sm shadow-2xl z-[100]"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
