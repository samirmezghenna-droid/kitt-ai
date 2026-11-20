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

function speak(text) {
  const scanner = document.querySelector(".scanner");
  const stopScanner = () => scanner?.classList.remove("speaking");
  stopScanner();
  if (!cfg.voice || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.88;
  utterance.pitch = 0.72;
  const voice = speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith("fr"));
  if (voice) utterance.voice = voice;
  scanner?.classList.add("speaking");
  utterance.onstart = () => scanner?.classList.add("speaking");
  utterance.onend = stopScanner;
  utterance.onerror = stopScanner;
  speechSynthesis.speak(utterance);
}

function reply(text) {
  $("greeting").textContent = "MESSAGE REÇU.";
  $("subline").textContent = text;
  add("KITT", text);
  speak(text);
  $("systemState").textContent = "SYSTÈMES OPÉRATIONNELS";
}

async function askAI(text) {
  if (!cfg.endpoint) return null;
  try {
    const response = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "Tu es KITT, assistant automobile francophone, précis et légèrement sarcastique. Réponds en français." },
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
          reply("Oui, je vous écoute. J'espère que c'est important.");
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
