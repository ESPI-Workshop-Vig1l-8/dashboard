import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Volume2, 
  VolumeX, 
  Lock, 
  Flame, 
  Thermometer, 
  Droplets, 
  Terminal, 
  Sliders, 
  Radio, 
  AlertCircle, 
  Eye, 
  RefreshCw, 
  X, 
  AlertTriangle 
} from 'lucide-react';

export default function App() {
  // Clock & Uptime
  const [time, setTime] = useState(new Date());
  const [uptime, setUptime] = useState(14820);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Hardware Actuators
  const [buzzerActive, setBuzzerActive] = useState(false);
  const [strobeActive, setStrobeActive] = useState(false);

  // Environmental Telemetry (ESP8266)
  const [temperature, setTemperature] = useState(24.2);
  const [humidity, setHumidity] = useState(46.0);
  const [gasPpm, setGasPpm] = useState(18);
  const [pirMotion, setPirMotion] = useState(false);

  // AI & ML
  const [anomalyScore, setAnomalyScore] = useState(0.16);
  const isAnomaly = anomalyScore >= 0.65 || gasPpm >= 60;
  const [humanDetected, setHumanDetected] = useState(false);
  const [inferenceFps, setInferenceFps] = useState(30);
  const [inferenceTime, setInferenceTime] = useState(28.4);

  // Webcam State & Hardware Video Ref
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [webcamError, setWebcamError] = useState(null);
  const videoRef = useRef(null);

  // Time Series Buffer
  const [sparklineData, setSparklineData] = useState(() => 
    Array.from({ length: 32 }, (_, i) => ({
      i,
      gas: 16 + Math.sin(i * 0.4) * 3 + Math.random() * 2,
      temp: 24.1 + Math.cos(i * 0.3) * 0.2
    }))
  );

  // Active Incident Toast (Sonner-style)
  const [activeIncident, setActiveIncident] = useState(null);

  // Terminal Logs & Filter Tabs
  const [activeTab, setActiveTab] = useState('ALL');
  const [logs, setLogs] = useState([
    { id: 1, ts: '11:20:04.120', category: 'SECURITY', level: 'SECURE', msg: 'mTLS handshake established with ESP8266 node (RSA-2048 / TLS 1.3)' },
    { id: 2, ts: '11:20:04.240', category: 'TELEMETRY', level: 'INFO', msg: 'Subscribed to topic "vigil8/sensors/telemetry" via Mosquitto' },
    { id: 3, ts: '11:20:06.810', category: 'IA', level: 'INFO', msg: 'YOLOv8n ONNX runtime initialized on local GPU backend (28ms inference)' },
    { id: 4, ts: '11:20:08.050', category: 'IA', level: 'INFO', msg: 'Scikit-Learn IsolationForest calibrated on 120-vector sliding baseline' },
    { id: 5, ts: '11:20:12.330', category: 'SECURITY', level: 'AUDIT', msg: 'UFW packet filter active: ports 8883, 5000, 3000 permitted' },
    { id: 6, ts: '11:20:14.900', category: 'TELEMETRY', level: 'DATA', msg: 'Ingested packet #4902 from 192.168.10.20: {temp: 24.2, hum: 46.0, gas: 18}' }
  ]);
  const logScrollRef = useRef(null);

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setUptime(u => u + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Synthesizer
  const triggerAudioPulse = (freq = 700) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  };

  // Sensor Telemetry Drift Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setTemperature(t => Number((t + (Math.random() - 0.49) * 0.06).toFixed(1)));
      setHumidity(h => Number(Math.max(30, Math.min(75, h + (Math.random() - 0.5) * 0.1)).toFixed(1)));
      setGasPpm(g => {
        if (g > 50) return g;
        return Math.max(14, Math.min(30, Math.round(g + (Math.random() - 0.5) * 1.2)));
      });

      setSparklineData(prev => {
        const nextI = (prev[prev.length - 1]?.i || 0) + 1;
        return [...prev.slice(1), { i: nextI, gas: gasPpm, temp: temperature }];
      });

      setInferenceFps(Math.floor(29 + Math.random() * 2));
      setInferenceTime(Number((27.5 + Math.random() * 2.5).toFixed(1)));
    }, 2000);
    return () => clearInterval(interval);
  }, [gasPpm, temperature]);

  // Log Append Helper
  const pushLog = (category, level, msg) => {
    const ts = new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0');
    setLogs(prev => [...prev.slice(-35), { id: Date.now() + Math.random(), ts, category, level, msg }]);
  };

  // Bind mediaStream to videoRef
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(err => {
        console.warn("Video play interrupted:", err);
      });
    }
  }, [webcamStream, webcamActive]);

  // Handle Webcam Start / Stop
  const toggleCameraFeed = async () => {
    if (!webcamActive) {
      setWebcamError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("getUserMedia non disponible dans ce navigateur");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false 
        });
        
        setWebcamStream(stream);
        setWebcamActive(true);
        pushLog('IA', 'INFO', 'Webcam hardware montée (/dev/video0) @ 640x480');
      } catch (err) {
        console.error("Camera access error:", err);
        let errorMsg = "Impossible d'accéder à la webcam";
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = "Accès refusé. Veuillez autoriser la caméra dans la barre d'adresse de votre navigateur.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = "Aucune caméra détectée sur cette machine.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = "Caméra déjà utilisée par une autre application (Teams, Discord, Zoom...).";
        } else if (err.message) {
          errorMsg = err.message;
        }
        setWebcamError(errorMsg);
        pushLog('IA', 'WARN', `Webcam indisponible : ${errorMsg}`);
      }
    } else {
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        setWebcamStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setWebcamActive(false);
      setWebcamError(null);
      pushLog('IA', 'INFO', 'Flux webcam arrêté');
    }
  };

  // Demo Scenarios
  const toggleIntruder = () => {
    const next = !humanDetected;
    setHumanDetected(next);
    setPirMotion(next);
    if (next) {
      setBuzzerActive(true);
      triggerAudioPulse(880);
      setActiveIncident({
        id: Date.now(),
        type: 'INTRUSION',
        title: 'Perimeter Intrusion Confirmed',
        desc: 'YOLOv8 detected human silhouette (94% confidence) correlated with PIR sensor on GPIO14.',
        level: 'CRITICAL'
      });
      pushLog('IA', 'ALERT', 'YOLOv8 target acquired: class=person bbox=[218,84,142,280] conf=0.94');
      pushLog('TELEMETRY', 'ALERT', 'Correlated PIR motion sensor trigger on GPIO14');
    } else {
      setBuzzerActive(false);
      setActiveIncident(null);
      pushLog('IA', 'INFO', 'Perimeter clear. Target tracking terminated.');
    }
  };

  const triggerGasLeakSimulation = () => {
    setGasPpm(134);
    setAnomalyScore(0.88);
    setBuzzerActive(true);
    triggerAudioPulse(950);
    setActiveIncident({
      id: Date.now(),
      type: 'GAS_ANOMALY',
      title: 'Atmospheric Gas Anomaly',
      desc: 'Isolation Forest flagged sudden kinetic drift: 134 ppm (baseline: 18 ppm).',
      level: 'CRITICAL'
    });
    pushLog('IA', 'ALERT', 'Isolation Forest anomaly score: 0.88 (exceeds threshold 0.65)');
    pushLog('TELEMETRY', 'WARN', 'MQ-2 concentration delta: +116 ppm above baseline');
  };

  const clearAllAlarms = () => {
    setGasPpm(18);
    setAnomalyScore(0.16);
    setHumanDetected(false);
    setPirMotion(false);
    setBuzzerActive(false);
    setStrobeActive(false);
    setActiveIncident(null);
    pushLog('SECURITY', 'SECURE', 'System latches reset by operator. All alarms cleared.');
  };

  const formatUptime = (secs) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const filteredLogs = logs.filter(l => activeTab === 'ALL' || l.category === activeTab);

  return (
    <div style={{ maxWidth: '1720px', margin: '0 auto', padding: '24px 32px', width: '100%', position: 'relative' }}>
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER                                                             */}
      {/* ========================================================================= */}
      <header className="card-surface" style={{ padding: '16px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '8px', 
            background: 'var(--bg-card-subtle)', 
            border: '1px solid var(--border-subtle)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)'
          }}>
            <Radio size={18} color="var(--sky)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '16px' }}>AetherCorp</span>
            <span style={{ color: 'var(--text-dim)' }}>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>Sentinel-X</span>
            <span style={{ color: 'var(--text-dim)' }}>/</span>
            <span style={{ color: 'var(--sky)', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600 }}>
              VIG1L-8
            </span>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 6px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span>Host: 192.168.10.1</span>
            <span>•</span>
            <span>ESP: 192.168.10.20</span>
          </div>
        </div>

        {/* Status Badges & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          <div className={`status-pill ${(humanDetected || isAnomaly) ? 'alert' : 'nominal'}`}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: (humanDetected || isAnomaly) ? 'var(--rose)' : 'var(--emerald)' 
            }} />
            <span style={{ fontWeight: 600 }}>{(humanDetected || isAnomaly) ? 'Perimeter Alert' : 'Nominal'}</span>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '5px 12px', 
            borderRadius: '8px', 
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}>
            <Lock size={13} color="var(--sky)" />
            <span>mTLS 1.3</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="interactive-btn"
          >
            {soundEnabled ? <Volume2 size={15} color="var(--emerald)" /> : <VolumeX size={15} />}
            <span className="tabular">{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </motion.button>

          <div style={{ 
            paddingLeft: '14px', 
            borderLeft: '1px solid var(--border-subtle)', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '13px', 
            color: 'var(--text-muted)',
            textAlign: 'right'
          }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }} className="tabular">
              {time.toISOString().slice(11, 19)} UTC
            </div>
            <div style={{ fontSize: '12px' }}>Up: {formatUptime(uptime)}</div>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN 4-PANEL LAYOUT (COMFORTABLE GRIDS)                                 */}
      {/* ========================================================================= */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(540px, 1fr))', 
        gap: '20px', 
        marginBottom: '20px' 
      }}>

        {/* ----------------------------------------------------------------------- */}
        {/* PANEL 1 : OPTICAL INFERENCE STREAM (YOLOv8-tiny)                        */}
        {/* ----------------------------------------------------------------------- */}
        <section className={`card-surface ${humanDetected ? 'is-alert' : ''}`} style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Camera size={18} color="var(--text-secondary)" />
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Optical Inference Stream (YOLOv8n)
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
              <span className="tabular" style={{ color: 'var(--emerald)', fontWeight: 600 }}>{inferenceFps} FPS</span>
              <span className="tabular" style={{ color: 'var(--text-muted)' }}>{inferenceTime}ms latency</span>
              
              <button 
                onClick={toggleCameraFeed}
                className="interactive-btn"
                style={{ 
                  color: webcamActive ? 'var(--emerald)' : 'var(--text-primary)',
                  borderColor: webcamActive ? 'var(--emerald-border)' : 'var(--border-medium)',
                  fontWeight: 600
                }}
              >
                {webcamActive ? 'Arrêter Webcam' : 'Ouvrir Webcam'}
              </button>
            </div>
          </div>

          {/* Viewport Frame */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            aspectRatio: '16/9', 
            background: '#040507', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            
            {/* The Hardware Video Element */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                display: webcamActive ? 'block' : 'none'
              }} 
            />

            {/* Standby Placeholder */}
            {!webcamActive && (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                background: 'linear-gradient(180deg, #0d1017 0%, #040507 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  border: '1px solid var(--border-medium)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--text-muted)'
                }}>
                  <Camera size={22} />
                </div>
                
                {webcamError ? (
                  <div style={{ maxWidth: '420px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--amber)', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                      <AlertTriangle size={16} />
                      <span>Information Caméra</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {webcamError}
                    </p>
                  </div>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Optical Stream Standby • Cliquez sur "Ouvrir Webcam" pour démarrer le flux
                  </span>
                )}
              </div>
            )}

            {/* Top-Left Metadata Badge */}
            <div style={{ 
              position: 'absolute', 
              top: '12px', 
              left: '12px', 
              background: 'rgba(9, 9, 11, 0.8)', 
              backdropFilter: 'blur(8px)',
              padding: '4px 10px', 
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              CAM01 // USB DIRECT // 640x480
            </div>

            {/* Fluid Bounding Box */}
            <AnimatePresence>
              {humanDetected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  style={{ 
                    position: 'absolute', 
                    top: '18%', 
                    left: '34%', 
                    width: '180px', 
                    height: '280px', 
                    border: '2px solid var(--rose)', 
                    background: 'rgba(244, 63, 94, 0.08)',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '6px'
                  }}
                >
                  <div style={{ 
                    background: 'var(--rose)', 
                    color: '#fff', 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    padding: '2px 8px', 
                    borderRadius: '3px',
                    alignSelf: 'flex-start',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    person • 0.94
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#fda4af', 
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '3px 6px',
                    borderRadius: '3px'
                  }}>
                    x:218 y:84 w:142 h:280
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom-Left PIR Pill */}
            <div style={{ 
              position: 'absolute', 
              bottom: '12px', 
              left: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: 'rgba(9, 9, 11, 0.85)', 
              backdropFilter: 'blur(8px)',
              padding: '5px 12px', 
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: pirMotion ? 'var(--rose)' : 'var(--text-secondary)'
            }}>
              <span style={{ 
                width: '7px', 
                height: '7px', 
                borderRadius: '50%', 
                background: pirMotion ? 'var(--rose)' : 'var(--emerald)' 
              }} />
              <span>PIR HC-SR501: {pirMotion ? 'Motion Detected' : 'Quiet'}</span>
            </div>

          </div>

          {/* Presentation Trigger Button */}
          <div style={{ marginTop: '16px' }}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={toggleIntruder}
              className="interactive-btn"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '11px',
                fontSize: '14px',
                borderColor: humanDetected ? 'var(--rose-border)' : 'var(--border-subtle)',
                color: humanDetected ? 'var(--rose)' : 'var(--text-primary)',
                fontWeight: 600
              }}
            >
              <Eye size={16} />
              <span>{humanDetected ? 'Annuler le test intrusion' : 'Simuler une intrusion (Détection YOLO)'}</span>
            </motion.button>
          </div>

        </section>

        {/* ----------------------------------------------------------------------- */}
        {/* PANEL 2 : ENVIRONMENTAL TELEMETRY & ISOLATION FOREST                   */}
        {/* ----------------------------------------------------------------------- */}
        <section className={`card-surface ${isAnomaly ? 'is-alert' : ''}`} style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Flame size={18} color="var(--text-secondary)" />
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Télémétrie Environnementale & Détection IA
              </h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ESP8266 SENSORS
            </span>
          </div>

          {/* 3 Metric Cards - BOLD NUMBERS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            
            {/* Temp */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Thermometer size={15} color="var(--amber)" />
                <span>DHT22 Temp</span>
              </div>
              <div className="tabular" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {temperature}°C
              </div>
              <div style={{ fontSize: '11px', color: 'var(--emerald)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                Baseline: 24.0°C
              </div>
            </div>

            {/* Humidity */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Droplets size={15} color="var(--sky)" />
                <span>Humidité</span>
              </div>
              <div className="tabular" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {humidity}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                Nominal 40-60%
              </div>
            </div>

            {/* MQ-2 Gas */}
            <div style={{ 
              background: gasPpm >= 60 ? 'var(--rose-subtle)' : 'var(--bg-card-subtle)', 
              border: `1px solid ${gasPpm >= 60 ? 'var(--rose-border)' : 'var(--border-subtle)'}`, 
              borderRadius: '8px', 
              padding: '14px 16px',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Flame size={15} color={gasPpm >= 60 ? 'var(--rose)' : 'var(--emerald)'} />
                <span>Gaz MQ-2</span>
              </div>
              <div className="tabular" style={{ fontSize: '28px', fontWeight: 700, color: gasPpm >= 60 ? 'var(--rose)' : 'var(--text-primary)' }}>
                {gasPpm} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>ppm</span>
              </div>
              <div style={{ fontSize: '11px', color: gasPpm >= 60 ? 'var(--rose)' : 'var(--emerald)', marginTop: '4px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {gasPpm >= 60 ? '⚠️ Seuil critique dépassé' : 'Air pur nominal'}
              </div>
            </div>

          </div>

          {/* Generous SVG Sparkline */}
          <div style={{ 
            background: 'var(--bg-card-subtle)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '8px', 
            padding: '14px 16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
              <span>HISTORIQUE TEMPOREL DES CAPTEURS (BUFFER 60S)</span>
              <span style={{ color: 'var(--sky)', fontWeight: 500 }}>• Gaz MQ-2 (ppm)</span>
            </div>
            
            <svg viewBox="0 0 500 85" style={{ width: '100%', height: '85px', overflow: 'visible' }}>
              <defs>
                <linearGradient id="gasAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gasPpm >= 60 ? 'var(--rose)' : 'var(--sky)'} stopOpacity="0.14" />
                  <stop offset="100%" stopColor={gasPpm >= 60 ? 'var(--rose)' : 'var(--sky)'} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              
              <polygon
                fill="url(#gasAreaGrad)"
                points={`0,85 ${sparklineData.map((d, idx) => {
                  const x = (idx / (sparklineData.length - 1)) * 500;
                  const normalized = Math.min(120, Math.max(10, d.gas));
                  const y = 80 - ((normalized - 10) / 110) * 70;
                  return `${x},${y}`;
                }).join(' ')} 500,85`}
              />

              <polyline 
                fill="none" 
                stroke={gasPpm >= 60 ? 'var(--rose)' : 'var(--sky)'} 
                strokeWidth="2" 
                points={sparklineData.map((d, idx) => {
                  const x = (idx / (sparklineData.length - 1)) * 500;
                  const normalized = Math.min(120, Math.max(10, d.gas));
                  const y = 80 - ((normalized - 10) / 110) * 70;
                  return `${x},${y}`;
                }).join(' ')}
              />
            </svg>
          </div>

          {/* Isolation Forest Widget */}
          <div style={{ 
            background: 'var(--bg-card-subtle)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '8px', 
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Scikit-Learn IsolationForest
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Modèle cinétique multi-séries (Détection d'anomalies de dérive)
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="tabular" style={{ 
                fontSize: '16px', 
                fontWeight: 700, 
                color: isAnomaly ? 'var(--rose)' : 'var(--emerald)' 
              }}>
                Score: {anomalyScore.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: isAnomaly ? 'var(--rose)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                {isAnomaly ? 'Anomalie Détectée' : 'Inlier Nominal'}
              </div>
            </div>
          </div>

        </section>

        {/* ----------------------------------------------------------------------- */}
        {/* PANEL 3 : HARDWARE ACTUATOR CONTROLS (ESP8266 RELAYS)                   */}
        {/* ----------------------------------------------------------------------- */}
        <section className="card-surface" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sliders size={18} color="var(--text-secondary)" />
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Actionneurs Matériels (Relais ESP8266)
              </h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              RELAIS EN LIGNE
            </span>
          </div>

          {/* Actuator Toggle Cards - COMFORTABLE TOUCH */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', flex: 1 }}>
            
            {/* Buzzer Relay */}
            <div style={{ 
              background: 'var(--bg-card-subtle)', 
              border: `1px solid ${buzzerActive ? 'var(--rose-border)' : 'var(--border-subtle)'}`, 
              borderRadius: '10px', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Buzzer Piézoélectrique
                  </span>
                  
                  {/* Tactile Spring Switch */}
                  <div 
                    onClick={() => {
                      const next = !buzzerActive;
                      setBuzzerActive(next);
                      if (next) triggerAudioPulse(800);
                      pushLog('SECURITY', 'ACTION', `Dispatched GPIO12 state: ${next ? 'HIGH' : 'LOW'}`);
                    }}
                    style={{ 
                      width: '44px', 
                      height: '24px', 
                      borderRadius: '12px', 
                      background: buzzerActive ? 'var(--rose)' : 'var(--bg-active)',
                      border: '1px solid var(--border-medium)',
                      padding: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <motion.div 
                      layout
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '50%', 
                        background: '#ffffff',
                        marginLeft: buzzerActive ? '20px' : '0px'
                      }}
                    />
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                  Alarme sonore physique sur GPIO12. Publie sur le topic MQTT <code style={{ fontSize: '11px', color: 'var(--sky)' }}>vigil8/commands/actuators</code>
                </p>
              </div>

              <div style={{ marginTop: '14px', fontSize: '12px', color: buzzerActive ? 'var(--rose)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                État : {buzzerActive ? 'Enclenché (Actif)' : 'Veille (Silencieux)'}
              </div>
            </div>

            {/* Strobe LEDs Relay */}
            <div style={{ 
              background: 'var(--bg-card-subtle)', 
              border: `1px solid ${strobeActive ? 'var(--sky-border)' : 'var(--border-subtle)'}`, 
              borderRadius: '10px', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    LEDs Stroboscopiques
                  </span>

                  {/* Tactile Spring Switch */}
                  <div 
                    onClick={() => {
                      const next = !strobeActive;
                      setStrobeActive(next);
                      pushLog('SECURITY', 'ACTION', `Dispatched GPIO13 strobe: ${next ? 'PWM_8HZ' : 'OFF'}`);
                    }}
                    style={{ 
                      width: '44px', 
                      height: '24px', 
                      borderRadius: '12px', 
                      background: strobeActive ? 'var(--sky)' : 'var(--bg-active)',
                      border: '1px solid var(--border-medium)',
                      padding: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <motion.div 
                      layout
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '50%', 
                        background: '#ffffff',
                        marginLeft: strobeActive ? '20px' : '0px'
                      }}
                    />
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                  Signal lumineux haute intensité relié à la sortie GPIO13 du microcontrôleur.
                </p>
              </div>

              <div style={{ marginTop: '14px', fontSize: '12px', color: strobeActive ? 'var(--sky)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                État : {strobeActive ? 'Strobe Pulsé (8 Hz)' : 'Veille (Éteint)'}
              </div>
            </div>

          </div>

          {/* Quick Jury Demo Buttons */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '10px' }}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={triggerGasLeakSimulation}
              className="interactive-btn"
              style={{ flex: 1, justifyContent: 'center', color: 'var(--amber)', padding: '10px', fontSize: '13px', fontWeight: 600 }}
            >
              Simuler Fuite Gaz (MQ-2)
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={clearAllAlarms}
              className="interactive-btn"
              style={{ flex: 1, justifyContent: 'center', color: 'var(--emerald)', padding: '10px', fontSize: '13px', fontWeight: 600 }}
            >
              <RefreshCw size={14} />
              Réinitialiser les Alarmes
            </motion.button>
          </div>

        </section>

        {/* ----------------------------------------------------------------------- */}
        {/* PANEL 4 : EVENT INGESTION & AUDIT STREAM                                */}
        {/* ----------------------------------------------------------------------- */}
        <section className="card-surface" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Terminal size={18} color="var(--text-secondary)" />
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Journal d'Ingestion & Audit de Sécurité
              </h2>
            </div>

            {/* Sliding Pill Tab Filter */}
            <div style={{ 
              display: 'flex', 
              background: 'var(--bg-card-subtle)', 
              padding: '3px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-subtle)',
              position: 'relative'
            }}>
              {['ALL', 'TELEMETRY', 'SECURITY', 'IA'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    position: 'relative',
                    background: 'transparent',
                    border: 'none',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    zIndex: 1,
                    fontWeight: 600,
                    transition: 'color 0.15s ease'
                  }}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeFilterPill"
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '6px',
                        zIndex: -1
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Monospaced Log Stream */}
          <div 
            ref={logScrollRef}
            style={{ 
              flex: 1, 
              minHeight: '220px', 
              maxHeight: '260px', 
              overflowY: 'auto', 
              background: '#040507', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: '8px', 
              padding: '12px 14px', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '12px',
              lineHeight: 1.7
            }}
          >
            {filteredLogs.map(l => {
              let tagColor = 'var(--text-muted)';
              if (l.level === 'ALERT') tagColor = 'var(--rose)';
              if (l.level === 'SECURE') tagColor = 'var(--emerald)';
              if (l.level === 'AUDIT') tagColor = 'var(--amber)';
              if (l.level === 'DATA') tagColor = 'var(--sky)';

              return (
                <div key={l.id} style={{ display: 'flex', gap: '10px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{l.ts}</span>
                  <span style={{ color: tagColor, fontWeight: 600, minWidth: '60px', flexShrink: 0 }}>
                    [{l.level}]
                  </span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{l.category} &gt;</span>
                  <span style={{ color: l.level === 'ALERT' ? '#fda4af' : 'inherit', wordBreak: 'break-all' }}>
                    {l.msg}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            <span>Buffer: 35 événements • QoS 1 garanti</span>
            <span>UFW: 8883/5000/3000 autorisés</span>
          </div>

        </section>

      </div>

      {/* ========================================================================= */}
      {/* 3. SONNER-STYLE INCIDENT TOAST                                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeIncident && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            style={{
              position: 'fixed',
              bottom: '28px',
              right: '28px',
              zIndex: 50,
              maxWidth: '460px',
              width: 'calc(100% - 56px)',
              background: 'var(--bg-card)',
              border: '1px solid var(--rose-border)',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 14px 36px -8px rgba(0,0,0,0.7), 0 0 24px -4px rgba(244, 63, 94, 0.25)',
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start'
            }}
          >
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '8px', 
              background: 'var(--rose-subtle)', 
              border: '1px solid var(--rose-border)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertCircle size={18} color="var(--rose)" />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeIncident.title}
                </span>
                <button 
                  onClick={() => setActiveIncident(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={16} />
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                {activeIncident.desc}
              </p>
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={clearAllAlarms}
                  className="interactive-btn"
                  style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--rose)', fontWeight: 600 }}
                >
                  Acquitter & Réarmer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        fontSize: '12px', 
        color: 'var(--text-muted)', 
        padding: '10px 4px',
        borderTop: '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-mono)'
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Sentinel-X-04</span>
          <span>•</span>
          <span>Firmware: C++ v1.2</span>
          <span>•</span>
          <span>Runtime: Mosquitto + Go Backend + Vite</span>
        </div>
        <div>
          <span>EPSI Workshop National • M1 2026</span>
        </div>
      </footer>

    </div>
  );
}
