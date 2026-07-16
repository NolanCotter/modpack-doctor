import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Clipboard, FileText, Search, Stethoscope, Upload, X } from 'lucide-react';
import './styles.css';

const DEMO_LOG = `[20:17:42] [main/INFO]: Loading Minecraft 1.21.1 with Fabric Loader 0.16.9
[20:17:43] [main/WARN]: Mod resolution failed
[20:17:43] [main/INFO]: The mod 'Sodium' (sodium) 0.6.5 requires version 0.110.0 or later of fabric-api, but version 0.107.0+1.21.1 is installed!`;

const JAVA_BY_CLASS_VERSION = { 52: 'Java 8', 55: 'Java 11', 61: 'Java 17', 65: 'Java 21', 69: 'Java 25' };
const diagnosis = (title, summary, fix, evidence, severity = 'high') => ({ title, summary, fix, evidence, severity });

function analyze(log) {
  const text = log.trim();
  if (!text) return [];
  const findings = [];
  const hasSpecificSignal = /The mod ['"]?[^'"(]+.*?requires version|Mixin(?: apply)? failed|InvalidMixinException|UnsupportedClassVersionError|OutOfMemoryError|Java heap space|NoClassDefFoundError|ClassNotFoundException|NoSuchMethodError|NoSuchFieldError|IncompatibleClassChangeError/i.test(text);
  const add = (value) => { if (!findings.some((item) => item.title === value.title)) findings.push(value); };
  text.split(/\r?\n/).forEach((line) => {
    const clean = line.replace(/^\[[^\]]+\]\s*/, '');
    const dependency = clean.match(/The mod ['"]?([^'"(]+).*?requires version\s+([\d][\w.+-]*).*?of\s+([\w.-]+).*?but version\s+([\d][\w.+-]*)/i);
    if (dependency) { const [, mod, required, dependencyName, installed] = dependency; add(diagnosis(`${mod.trim()} is incompatible with ${dependencyName}`, `${mod.trim()} requires ${dependencyName} ${required} or newer. This pack has ${installed}.`, `Upgrade ${dependencyName} to ${required} or newer, or install a ${mod.trim()} version compatible with ${installed}.`, line)); }
    const genericDependency = clean.match(/(?:depends on|requires)\s+([\w.-]+)\s*(?:@\s*\[?>?=?\s*)?([\d][\w.+-]*)/i);
    if (!dependency && genericDependency && /(?:resolution failed|hard_dep|depends|requires)/i.test(text)) { const [, dep, wanted] = genericDependency; add(diagnosis('A required dependency is missing or too old', `The loader could not satisfy a dependency on ${dep} ${wanted}.`, `Install or update ${dep} to the version requested by the mod, then relaunch.`, line)); }
    const mixin = clean.match(/Mixin(?: apply)? failed.*?(?:in|for)\s+([\w.$/]+)/i) || clean.match(/([\w.$/]+)\.mixins\.json/i);
    if (mixin || /InvalidMixinException|MixinTransformerError/i.test(clean)) add(diagnosis('A mixin patch could not be applied', 'One mod tried to patch Minecraft or another mod, but its target no longer matched.', 'Update the mod named near this error. If it persists, remove it or use a version made for your Minecraft version.', line));
    const classVersion = clean.match(/UnsupportedClassVersionError.*?(?:class file version|version)\s*(\d+)/i);
    if (classVersion) { const java = JAVA_BY_CLASS_VERSION[Number(classVersion[1])] || `Java matching class format ${classVersion[1]}`; add(diagnosis('Java is too old for one of your mods', `A mod was compiled for ${java}, but the game is running an older Java runtime.`, `Set your launcher to use ${java} or newer, then restart the instance.`, line)); }
    if (/OutOfMemoryError|Java heap space|GC overhead limit exceeded/i.test(clean)) add(diagnosis('Minecraft ran out of memory', 'The Java runtime could not reserve enough heap memory while loading or playing.', 'Raise the instance memory allocation gradually (try 4–6 GB for a large pack) and close memory-heavy apps.', line));
    const missingClass = clean.match(/(?:NoClassDefFoundError|ClassNotFoundException):?\s*([\w.$/]+)/i);
    if (missingClass) add(diagnosis('A mod class is missing at launch', `Minecraft could not find ${missingClass[1].replaceAll('/', '.')}. This usually means a missing dependency or mismatched mod version.`, 'Check the mod’s dependency page, install the required library, and ensure every mod matches your Minecraft and loader version.', line));
    if (/NoSuchMethodError|NoSuchFieldError|IncompatibleClassChangeError/i.test(clean)) add(diagnosis('Two mod versions do not agree', 'A mod expected a method or field that is absent in the version currently installed.', 'Update the named mod and its libraries together, or roll the recently changed mod back to a known-compatible version.', line));
    if (/Could not execute entrypoint|Exception during mod loading|Mod resolution failed/i.test(clean) && !findings.length && !hasSpecificSignal) add(diagnosis('Mod loading stopped before Minecraft started', 'Fabric stopped during dependency resolution or mod initialization.', 'Look for the first “requires”, “depends”, or “caused by” line below this message; it identifies the mod to change.', line, 'medium'));
  });
  return findings.slice(0, 4);
}

function Finding({ item, number }) {
  const [copied, setCopied] = useState(false);
  const copyFix = async () => { await navigator.clipboard?.writeText(item.fix); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  return <article className="finding"><div className="finding-marker"><span>{number}</span></div><div className="finding-content"><div className="finding-topline"><span className={`severity ${item.severity}`}>{item.severity === 'high' ? 'Likely cause' : 'Possible cause'}</span></div><h2>{item.title}</h2><p>{item.summary}</p><div className="fix-block"><strong>Suggested fix</strong><span>{item.fix}</span></div><details><summary>Why I think this</summary><code>{item.evidence}</code></details></div><button className="copy-button" onClick={copyFix} aria-label="Copy suggested fix">{copied ? <Check size={16} /> : <Clipboard size={16} />}</button></article>;
}

function App() {
  const [log, setLog] = useState(DEMO_LOG); const [fileName, setFileName] = useState('demo-fabric-crash.log'); const fileInput = useRef(null); const findings = useMemo(() => analyze(log), [log]);
  const onFile = async (event) => { const file = event.target.files?.[0]; if (!file) return; setLog(await file.text()); setFileName(file.name); };
  const clearLog = () => { setLog(''); setFileName(''); };
  return <main><header className="topbar"><a className="brand" href="#top"><Stethoscope size={20} strokeWidth={2.2} /><span>Modpack Doctor</span></a><span className="mode"><span className="mode-dot" />Rule-based analysis</span></header><section className="workspace" id="top"><div className="intro"><p className="kicker">Minecraft crash diagnosis</p><h1>Find the useful line.</h1><p>Paste a crash report or upload a log. The doctor scans common Fabric failures and turns the first meaningful signal into an actionable fix.</p></div><div className="work-grid"><section className="log-panel" aria-label="Crash log input"><div className="panel-heading"><div><h2>Crash log</h2><span>{fileName || 'Nothing loaded yet'}</span></div><div className="panel-actions"><input ref={fileInput} className="visually-hidden" type="file" accept=".log,.txt,.crash" onChange={onFile} /><button className="quiet-button" onClick={() => fileInput.current?.click()}><Upload size={15} />Upload file</button>{log && <button className="icon-button" onClick={clearLog} aria-label="Clear log"><X size={16} /></button>}</div></div><textarea value={log} onChange={(event) => { setLog(event.target.value); setFileName('Pasted crash log'); }} spellCheck="false" placeholder="Paste latest.log or a crash report here…" /><div className="panel-footer"><span>{log ? `${log.split(/\r?\n/).length.toLocaleString()} lines loaded` : 'Logs stay in your browser'}</span><button className="sample-button" onClick={() => { setLog(DEMO_LOG); setFileName('demo-fabric-crash.log'); }}><FileText size={14} />Use a sample</button></div></section><section className="results-panel" aria-live="polite"><div className="panel-heading"><div><h2>Diagnosis</h2><span>{findings.length ? `${findings.length} signal${findings.length === 1 ? '' : 's'} found` : 'Waiting for a signal'}</span></div><Search size={18} className="search-icon" /></div><div className="findings">{findings.length ? findings.map((item, index) => <Finding key={item.title} item={item} number={String(index + 1).padStart(2, '0')} />) : <div className="empty-state"><AlertTriangle size={21} /><h2>{log ? 'No familiar pattern yet' : 'Bring the stack trace.'}</h2><p>{log ? 'Try including more lines before the crash, especially “Caused by” and Fabric Loader messages.' : 'Paste a Fabric crash report, latest.log excerpt, or launcher error.'}</p></div>}</div></section></div></section><footer>Local analysis only · Built for Fabric logs first</footer></main>;
}
export default App;
