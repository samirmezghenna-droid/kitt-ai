import { localCommand, wazeUrl } from "./core.js";

const $ = id => document.getElementById(id);
let recognition = null;
let wakeRecognition = null;
let wakeActive = false;
const messages = $("messages");

let cfg = {
  endpoint: localStorage.getItem("kitt-endpoint") || "",
  voice: localStorage.getItem("kitt-voice") !== "false",
  sarcasm: localStorage.getItem("kitt-sarcasm") !== "false"
};

$("aiEndpoint").value = cfg.endpoint;
$("voiceEnabled").checked = cfg.voice;
$("sarcasmEnabled").checked = cfg.sarcasm;

function add(who, text) {
  const article = document.createElement("article");
  const heading = document.createElement("b");
  const paragraph = document.createElement("p");
  heading.textContent = who;
  paragraph.textContent = text;
  article.append(heading, paragraph);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
}

function frenchVoice() {
  const voices = speechSynthesis.getVoices();
  // Prefer Daniel only when the installed voice is French; otherwise use a French voice.
  return voices.find(item =>
    /daniel/i.test(item.name) && item.lang.toLowerCase().startsWith("fr")
  ) || voices.find(item => item.lang.toLowerCase().startsWith("fr"));
}

let activeSpeech = null;
let meterTimer = null;

function stopMeter() {
  if (meterTimer !== null) {
    clearInterval(meterTimer);
    meterTimer = null;
  }
  document.querySelectorAll(".voice-column i").forEach(segment => {
    segment.classList.remove("meter-on");
    segment.style.removeProperty("opacity");
    segment.style.removeProperty("background");
    segment.style.removeProperty("box-shadow");
  });
}

function startMeter() {
  stopMeter();
  const columns = [...document.querySelectorAll(".voice-column")];
  if (columns.length !== 3) return;

  // A single smooth envelope drives all three columns so their movement
  // feels like one instrument, with a slightly stronger centre column.
  const startedAt = performance.now();
  const levels = [5, 8, 5];
  const paint = () => columns.forEach((column, colIndex) => {
    const segments = [...column.querySelectorAll("i")];
    segments.forEach((segment, index) => {
      const lit = index < levels[colIndex];
      segment.classList.toggle("meter-on", lit);
      if (lit) {
        segment.style.setProperty("opacity", "1", "important");
        segment.style.setProperty("background", "linear-gradient(180deg,#ff8585 0%,#ff1828 42%,#b00010 100%)", "important");
        segment.style.setProperty("box-shadow", "0 0 7px #f21b2b,0 0 14px #df071b88,inset 0 0 2px #ffd0d0", "important");
      } else {
        segment.style.setProperty("opacity", "0.12", "important");
        segment.style.setProperty("background", "#65070d", "important");
        segment.style.setProperty("box-shadow", "inset 0 0 2px #230000", "important");
      }
    });
  });

  paint();
  meterTimer = setInterval(() => {
    const t = (performance.now() - startedAt) / 1000;
    const shared = Math.sin(t * 2.45) * 2.7 + Math.sin(t * 4.1) * 1.25;
    const phases = [0.0, 0.38, 0.76];
    const offsets = [-0.8, 1.25, -0.5];
    for (let i = 0; i < 3; i++) {
      const wave = shared + Math.sin(t * 1.65 + phases[i]) * 1.15 + offsets[i];
      const target = Math.max(1, Math.min(13, Math.round(6.2 + wave)));
      levels[i] += (target - levels[i]) * 0.42;
      levels[i] = Math.round(levels[i]);
    }
    paint();
  }, 85);
}

function speak(text) {
  const scanner = document.querySelector(".voicebox");
  if (!cfg.voice || !window.speechSynthesis) {
    scanner?.classList.remove("speaking");
    activeSpeech = null;
    return;
  }
  // Ignore end/error events from an older utterance cancelled by a new reply.
  activeSpeech = null;
  stopMeter();
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  activeSpeech = utterance;
  utterance.lang = "fr-FR";
  utterance.rate = 0.82;
  utterance.pitch = 0.55;
  utterance.volume = 1;
  const voice = frenchVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  scanner?.classList.add("speaking");
  startMeter();
  utterance.onstart = () => {
    if (activeSpeech === utterance) {
      scanner?.classList.add("speaking");
      startMeter();
    }
  };
  const finish = () => {
    if (activeSpeech !== utterance) return;
    activeSpeech = null;
    scanner?.classList.remove("speaking");
    stopMeter();
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  speechSynthesis.speak(utterance);
}

function reply(text) {
  $("greeting").textContent = "MESSAGE REÇU.";
  $("subline").textContent = text;
  add("KITT", text);
  speak(text);
  $("systemState").textContent = "SYSTÈMES OPÉRATIONNELS";
}

$("systemCheck").addEventListener("click", () => {
  const voiceAvailable = Boolean(window.speechSynthesis);
  const micAvailable = Boolean(Speech());
  reply("Vérification terminée. Interface opérationnelle. Synthèse vocale " +
    (voiceAvailable ? "disponible" : "indisponible") +
    ". Reconnaissance vocale " + (micAvailable ? "détectée" : "non détectée") +
    ". Aucun diagnostic mécanique du véhicule n'est connecté.");
});

async function askAI(text) {
  if (!cfg.endpoint) return null;
  try {
    const response = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "Tu es KITT, assistant automobile francophone, précis et légèrement sarcastique. Réponds en français. Appelle toujours ton interlocuteur Samir, jamais Michael." },
          { role: "user", content: text }
        ]
      })
    });
    if (!response.ok) throw Error(response.status);
    const data = await response.json();
    return data.reply || data.choices?.[0]?.message?.content || "Réponse IA vide.";
  } catch {
    return "La liaison IA est indisponible. Mode local maintenu.";
  }
}

async function command(text) {
  if (!text.trim()) return;
  add("VOUS", text);
  $("commandInput").value = "";
  const local = localCommand(text, { sarcasm: cfg.sarcasm });

  if (local?.type === "navigate") {
    const destination = local.destination || "";
    reply(destination
      ? "Calcul de l'itinéraire vers " + destination + ". Je transmets la destination à Waze."
      : "J'ouvre Waze. Vous pourrez choisir votre destination. Gardez les yeux sur la route.");
    window.location.assign(wazeUrl(destination));
    return;
  }

  if (local?.type === "reply") {
    reply(local.text);
    return;
  }

  const answer = await askAI(text);
  reply(answer || "Commande inconnue en mode local. Dites « Aide » ou configurez un service IA.");
}

$("commandForm").addEventListener("submit", event => {
  event.preventDefault();
  command($("commandInput").value);
});
document.querySelectorAll("[data-command]").forEach(button => {
  button.addEventListener("click", () => command(button.dataset.command));
});

const Speech = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;

function beginRecognition(Recognition) {
  const instance = new Recognition();
  recognition = instance;
  let transcript = "";
  let errorCode = "";
  instance.lang = "fr-FR";
  instance.continuous = false;
  instance.interimResults = false;
  instance.maxAlternatives = 3;

  instance.onstart = () => {
    $("talkButton").classList.add("listening");
    $("voiceStatus").textContent = "ÉCOUTE EN COURS";
  };

  instance.onresult = event => {
    transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
    if (transcript) $("voiceStatus").textContent = "COMMANDE REÇUE";
  };

  instance.onerror = event => {
    errorCode = event.error || "inconnu";
  };

  instance.onend = () => {
    if (recognition !== instance) return;
    recognition = null;
    $("talkButton").classList.remove("listening");
    $("voiceStatus").textContent = "MICRO INACTIF";

    // Wait until Safari has fully released the microphone before KITT speaks.
    if (transcript) {
      command(transcript);
    } else if (errorCode === "no-speech") {
      add("KITT", "Je n'ai rien entendu. Appuyez sur le micro et parlez après mon signal.");
    } else if (errorCode === "aborted") {
      add("KITT", "Safari a interrompu l'écoute. Cela peut être un défaut de reconnaissance vocale d'iOS. Réessayez après quelques secondes.");
      $("voiceStatus").textContent = "ÉCOUTE INTERROMPUE";
    } else if (errorCode) {
      add("KITT", "Erreur micro : " + errorCode);
    } else if (!transcript) {
      add("KITT", "Je n'ai reçu aucune commande vocale.");
    }
  };

  try {
    instance.start();
  } catch {
    recognition = null;
    $("talkButton").classList.remove("listening");
    $("voiceStatus").textContent = "MICRO INACTIF";
    add("KITT", "Impossible de démarrer le micro. Fermez les autres applications utilisant le microphone puis réessayez.");
  }
}

function startMic(Recognition) {
  // A short spoken cue before recognition is a known partial workaround for
  // Safari audio-session problems. Recognition starts only after the cue ends.
  if (cfg.voice && window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined") {
    speechSynthesis.cancel();
    const cue = new SpeechSynthesisUtterance("Je vous écoute.");
    cue.lang = "fr-FR";
    const voice = frenchVoice();
    if (voice) {
      cue.voice = voice;
      cue.lang = voice.lang;
    }
    cue.rate = 1;
    cue.onend = () => {
      if (!recognition) beginRecognition(Recognition);
    };
    cue.onerror = () => {
      if (!recognition) beginRecognition(Recognition);
    };
    speechSynthesis.speak(cue);
    $("voiceStatus").textContent = "PRÉPARATION DU MICRO";
  } else {
    beginRecognition(Recognition);
  }
}

$("talkButton").onclick = () => {
  const Recognition = Speech();
  if (!Recognition) {
    reply("Reconnaissance vocale non disponible dans ce navigateur. Utilisez le champ texte ou la dictée iOS.");
    return;
  }
  if (recognition) {
    $("voiceStatus").textContent = "LAISSEZ KITT TERMINER L'ÉCOUTE";
    return;
  }
  startMic(Recognition);
};

$("wakeButton").onclick = () => {
  const Recognition = Speech();
  if (!Recognition) {
    reply("Cette version de votre navigateur ne prend pas en charge l'API nécessaire au mot-clé Bonjour KITT.");
    return;
  }
  if (wakeActive) {
    wakeActive = false;
    wakeRecognition?.stop();
    wakeRecognition = null;
    $("wakeButton").textContent = "ACTIVER « BONJOUR KITT »";
    $("voiceStatus").textContent = "MICRO INACTIF";
    return;
  }

  wakeActive = true;
  $("wakeButton").textContent = "DÉSACTIVER LE MOT-CLÉ";
  $("voiceStatus").textContent = "ÉCOUTE AU PREMIER PLAN";

  const listen = () => {
    if (!wakeActive) return;
    wakeRecognition = new Recognition();
    wakeRecognition.lang = "fr-FR";
    wakeRecognition.continuous = true;
    wakeRecognition.onresult = event => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const heard = event.results[index][0].transcript;
        if (/bonjour\s+(?:kitt|kit|quitte)/i.test(heard)) {
          reply("Oui, Samir, je vous écoute. J'espère que c'est important.");
          const follow = heard.replace(/bonjour\s+(?:kitt|kit|quitte)/i, "").trim();
          if (follow) command(follow);
        }
      }
    };
    wakeRecognition.onend = () => {
      wakeRecognition = null;
      if (wakeActive) setTimeout(listen, 500);
    };
    wakeRecognition.onerror = () => {
      $("voiceStatus").textContent = "MOT-CLÉ INTERROMPU PAR SAFARI";
    };
    try {
      wakeRecognition.start();
    } catch {
      wakeActive = false;
      $("voiceStatus").textContent = "MICRO INACTIF";
    }
  };
  listen();
};

$("settingsButton").onclick = () => $("settingsDialog").showModal();
$("saveSettings").onclick = () => {
  cfg = {
    endpoint: $("aiEndpoint").value.trim(),
    voice: $("voiceEnabled").checked,
    sarcasm: $("sarcasmEnabled").checked
  };
  localStorage.setItem("kitt-endpoint", cfg.endpoint);
  localStorage.setItem("kitt-voice", cfg.voice);
  localStorage.setItem("kitt-sarcasm", cfg.sarcasm);
  $("connectionLabel").textContent = cfg.endpoint ? "IA CONFIGURÉE" : "MODE LOCAL";
};

function tick() {
  $("clock").textContent = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).format(new Date());
}
tick();
setInterval(tick, 1000);
$("connectionLabel").textContent = cfg.endpoint ? "IA CONFIGURÉE" : "MODE LOCAL";
if (!Speech()) $("voiceStatus").textContent = "DICTÉE NON PRISE EN CHARGE";
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(console.warn);
