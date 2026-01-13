// app-enhanced.js - Enhanced version with all UX/UI improvements

// ==================== CONFIGURATION ====================
const SUPABASE_URL = 'https://vpxuafxascidlgwmafcj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g1T1CJJB8I-dbbAqnlQkXw_ySgwdrHF';

// Initialize Supabase
let supabaseClient;
try {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (err) {
  console.error('Errore inizializzazione Supabase:', err);
}

// ==================== GAME STATE ====================
let currentDifficulty = null;
let selectedCategories = ["all"];
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let playerName = "";
let currentStreak = 0;
let maxStreak = 0;
let correctAnswers = 0;
let startTime = null;
let questionStartTime = null;
let responseTimes = [];

// ==================== SETTINGS ====================
let settings = {
  darkMode: false,
  soundEnabled: true,
  animationsEnabled: true,
  explanationsEnabled: true,
  fontSize: 'medium'
};

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('quizSettings');
  if (saved) {
    settings = { ...settings, ...JSON.parse(saved) };
    applySettings();
  }
}

function saveSettings() {
  localStorage.setItem('quizSettings', JSON.stringify(settings));
}

function applySettings() {
  // Dark mode
  if (settings.darkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  // Font size
  document.body.className = `font-${settings.fontSize}`;
  
  // Animations
  if (!settings.animationsEnabled) {
    document.body.classList.add('no-animations');
  } else {
    document.body.classList.remove('no-animations');
  }
  
  // Update toggles
  document.getElementById('darkModeToggle').checked = settings.darkMode;
  document.getElementById('soundToggle').checked = settings.soundEnabled;
  document.getElementById('animationsToggle').checked = settings.animationsEnabled;
  document.getElementById('fontSizeSelect').value = settings.fontSize;
}

// ==================== SOUND EFFECTS ====================
const sounds = {
  click: () => playTone(800, 0.1, 'sine'),
  correct: () => playTone(1000, 0.2, 'sine'),
  wrong: () => playTone(200, 0.3, 'sawtooth'),
  complete: () => {
    playTone(523, 0.1, 'sine');
    setTimeout(() => playTone(659, 0.1, 'sine'), 100);
    setTimeout(() => playTone(784, 0.2, 'sine'), 200);
  },
  streak: () => {
    playTone(1200, 0.1, 'sine');
    setTimeout(() => playTone(1400, 0.1, 'sine'), 100);
  }
};

function playTone(frequency, duration, type = 'sine') {
  if (!settings.soundEnabled) return;
  
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (err) {
    console.warn('Audio not supported:', err);
  }
}

// ==================== STATISTICS ====================
function loadStats() {
  const saved = localStorage.getItem('quizStats');
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    totalGames: 0,
    bestScore: 0,
    totalScore: 0,
    currentStreak: 0,
    bestStreak: 0,
    categoryStats: {}
  };
}

function saveStats(stats) {
  localStorage.setItem('quizStats', JSON.stringify(stats));
}

function updateStats(gameScore, difficulty, categories) {
  const stats = loadStats();
  
  stats.totalGames++;
  stats.totalScore += gameScore;
  if (gameScore > stats.bestScore) {
    stats.bestScore = gameScore;
  }
  if (maxStreak > stats.bestStreak) {
    stats.bestStreak = maxStreak;
  }
  
  // Update category stats
  categories.forEach(cat => {
    if (!stats.categoryStats[cat]) {
      stats.categoryStats[cat] = { games: 0, totalScore: 0, bestScore: 0 };
    }
    stats.categoryStats[cat].games++;
    stats.categoryStats[cat].totalScore += gameScore;
    if (gameScore > stats.categoryStats[cat].bestScore) {
      stats.categoryStats[cat].bestScore = gameScore;
    }
  });
  
  saveStats(stats);
  return stats;
}

function displayStats() {
  const stats = loadStats();
  
  document.getElementById('statTotalGames').textContent = stats.totalGames;
  document.getElementById('statBestScore').textContent = stats.bestScore;
  document.getElementById('statAvgScore').textContent = stats.totalGames > 0 
    ? Math.round(stats.totalScore / stats.totalGames) 
    : 0;
  document.getElementById('statStreak').textContent = stats.bestStreak;
}

// ==================== DOM ELEMENTS ====================
const diffButtons = document.querySelectorAll(".difficulty-card");
const categoryButtons = document.querySelectorAll(".category-btn");
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const overScreen = document.getElementById("overScreen");

const btnStart = document.getElementById("btnStart");
const inputName = document.getElementById("inputName");

const playerLabel = document.getElementById("playerLabel");
const diffLabel = document.getElementById("diffLabel");
const scoreLabel = document.getElementById("scoreLabel");

const choicesGrid = document.getElementById("choices");
const questionText = document.getElementById("questionText");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");

const streakIndicator = document.getElementById("streakIndicator");
const streakCount = document.getElementById("streakCount");

const finalScore = document.getElementById("finalScore");
const btnGiveUp = document.getElementById("btnGiveUp");
const btnBack = document.getElementById("btnBack");
const btnReplay = document.getElementById("btnReplay");
const btnShare = document.getElementById("btnShare");

// ==================== UTILITY FUNCTIONS ====================
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"']/g, ch => ({ 
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' 
  })[ch]);
}

function capitalize(s) {
  return typeof s === "string" && s.length 
    ? s.charAt(0).toUpperCase() + s.slice(1) 
    : s;
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== CONFETTI ANIMATION ====================
function createConfetti() {
  const container = document.getElementById('confettiContainer');
  if (!container || !settings.animationsEnabled) return;
  
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      container.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 3000);
    }, i * 30);
  }
}

// ==================== SETTINGS PANEL ====================
const settingsPanel = document.getElementById('settingsPanel');
const btnSettings = document.getElementById('btnSettings');
const closeSettings = document.getElementById('closeSettings');

btnSettings.addEventListener('click', () => {
  sounds.click();
  settingsPanel.classList.add('open');
});

closeSettings.addEventListener('click', () => {
  sounds.click();
  settingsPanel.classList.remove('open');
});

document.getElementById('darkModeToggle').addEventListener('change', (e) => {
  settings.darkMode = e.target.checked;
  saveSettings();
  applySettings();
  sounds.click();
});

document.getElementById('soundToggle').addEventListener('change', (e) => {
  settings.soundEnabled = e.target.checked;
  saveSettings();
  if (settings.soundEnabled) sounds.click();
});

document.getElementById('animationsToggle').addEventListener('change', (e) => {
  settings.animationsEnabled = e.target.checked;
  saveSettings();
  applySettings();
  sounds.click();
});

document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
  settings.fontSize = e.target.value;
  saveSettings();
  applySettings();
  sounds.click();
});

// ==================== STATISTICS MODAL ====================
const statsModal = document.getElementById('statsModal');
const btnStats = document.getElementById('btnStats');
const closeStats = document.getElementById('closeStats');

if (btnStats && statsModal) {
  btnStats.addEventListener('click', () => {
    sounds.click();
    displayStats();
    statsModal.style.display = 'flex';
  });
}

if (closeStats && statsModal) {
  closeStats.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sounds.click();
    statsModal.style.display = 'none';
  });
}

// Chiudi modal cliccando fuori
if (statsModal) {
  statsModal.addEventListener('click', (e) => {
    if (e.target === statsModal) {
      sounds.click();
      statsModal.style.display = 'none';
    }
  });
}

// ==================== GUIDE ====================
const guideModal = document.getElementById("guideModal");
const btnInfo = document.getElementById("btnInfo");
const closeGuide = document.getElementById("closeGuide");

if (btnInfo && guideModal) {
  btnInfo.addEventListener("click", () => {
    sounds.click();
    guideModal.style.display = 'flex';
  });
}

if (closeGuide && guideModal) {
  closeGuide.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    sounds.click();
    guideModal.style.display = 'none';
  });
}

// Chiudi modal guida cliccando fuori
if (guideModal) {
  guideModal.addEventListener('click', (e) => {
    if (e.target === guideModal) {
      sounds.click();
      guideModal.style.display = 'none';
    }
  });
}

// ==================== DIFFICULTY SELECTION ====================
diffButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    sounds.click();
    selectDifficulty(btn.dataset.diff);
  });
});

function selectDifficulty(diff) {
  currentDifficulty = diff;
  diffButtons.forEach(b => {
    b.classList.toggle("selected", b.dataset.diff === diff);
  });
  updateQuestionsCount();
}

// ==================== CATEGORY SELECTION ====================
categoryButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    sounds.click();
    toggleCategory(btn.dataset.category);
  });
});

function toggleCategory(cat) {
  if (cat === "all") {
    selectedCategories = ["all"];
    categoryButtons.forEach(b => {
      b.classList.toggle("selected", b.dataset.category === "all");
    });
  } else {
    const allBtn = Array.from(categoryButtons).find(b => b.dataset.category === "all");
    if (allBtn) allBtn.classList.remove("selected");
    
    const idx = selectedCategories.indexOf(cat);
    if (idx > -1) {
      selectedCategories.splice(idx, 1);
    } else {
      selectedCategories = selectedCategories.filter(c => c !== "all");
      selectedCategories.push(cat);
    }
    
    if (selectedCategories.length === 0) {
      selectedCategories = ["all"];
      if (allBtn) allBtn.classList.add("selected");
    }
    
    categoryButtons.forEach(b => {
      if (b.dataset.category !== "all") {
        b.classList.toggle("selected", selectedCategories.includes(b.dataset.category));
      }
    });
  }
  updateQuestionsCount();
}

// ==================== UPDATE QUESTIONS COUNT ====================
function updateQuestionsCount() {
  const countEl = document.getElementById("questionsCount");
  
  if (!currentDifficulty) {
    countEl.textContent = "0";
    return;
  }
  
  let filtered = QUESTIONS.filter(q => q.difficulty === currentDifficulty);
  
  if (!selectedCategories.includes("all")) {
    filtered = filtered.filter(q => selectedCategories.includes(q.category));
  }
  
  countEl.textContent = filtered.length;
}

// ==================== START GAME ====================
btnStart.addEventListener("click", () => {
  sounds.click();
  playerName = (inputName.value || "").trim();
  
  if (!playerName) {
    showToast("Inserisci un nome!", "error");
    sounds.wrong();
    return;
  }
  
  if (!currentDifficulty) {
    showToast("Seleziona una difficoltà!", "error");
    sounds.wrong();
    return;
  }

  // Filter questions
  currentQuestions = QUESTIONS.filter(q => {
    if (q.difficulty !== currentDifficulty) return false;
    if (selectedCategories.includes("all")) return true;
    return selectedCategories.includes(q.category);
  });
  
  if (currentQuestions.length === 0) {
    showToast("Nessuna domanda disponibile!", "error");
    sounds.wrong();
    return;
  }
  
  currentQuestions = shuffleArray(currentQuestions);

  // Reset game state
  currentIndex = 0;
  score = 0;
  currentStreak = 0;
  maxStreak = 0;
  correctAnswers = 0;
  responseTimes = [];
  startTime = Date.now();

  // UI
  startScreen.style.display = "none";
  gameScreen.style.display = "block";

  playerLabel.textContent = playerName;
  diffLabel.textContent = capitalize(currentDifficulty);
  scoreLabel.textContent = score;
  
  streakIndicator.style.display = "none";

  showQuestion();
  showToast("Buona fortuna! 🍀", "success");
});

// ==================== SHOW QUESTION ====================
function showQuestion() {
  if (currentIndex >= currentQuestions.length) {
    endGame();
    return;
  }

  const data = currentQuestions[currentIndex];
  questionText.textContent = data.q || "";
  
  questionStartTime = Date.now();

  // Hide explanation box
  const explanationBox = document.getElementById('explanationBox');
  if (explanationBox) {
    explanationBox.style.display = 'none';
  }

  // Update progress
  const progress = ((currentIndex) / currentQuestions.length) * 100;
  progressBar.style.width = progress + '%';
  progressText.textContent = `Domanda ${currentIndex + 1} di ${currentQuestions.length}`;

  // Create choices
  choicesGrid.innerHTML = "";
  data.choices.forEach((choice, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = choice;
    btn.dataset.idx = idx;

    btn.addEventListener("click", () => {
      sounds.click();
      Array.from(choicesGrid.children).forEach(b => b.disabled = true);
      checkAnswer(idx, btn);
    });

    choicesGrid.appendChild(btn);
  });
}

// ==================== CHECK ANSWER ====================
function checkAnswer(index, clickedBtn) {
  const data = currentQuestions[currentIndex];
  const responseTime = Date.now() - questionStartTime;
  responseTimes.push(responseTime);
  
  if (Number(index) === Number(data.a)) {
    // Correct answer
    clickedBtn.classList.add("correct");
    sounds.correct();
    
    score++;
    correctAnswers++;
    currentStreak++;
    
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }
    
    // Streak bonus
    if (currentStreak >= 3) {
      sounds.streak();
      streakIndicator.style.display = "inline-flex";
      streakCount.textContent = currentStreak;
    }
    
    // Speed bonus (under 5 seconds)
    if (responseTime < 5000) {
      score += 0.5;
      showToast("Bonus velocità! ⚡", "success");
    }
    
    scoreLabel.textContent = Math.floor(score);

    setTimeout(() => {
      currentIndex++;
      if (currentIndex >= currentQuestions.length) {
        endGame();
      } else {
        showQuestion();
      }
    }, 1000);
    
  } else {
    // Wrong answer
    clickedBtn.classList.add("wrong");
    sounds.wrong();
    
    currentStreak = 0;
    streakIndicator.style.display = "none";
    
    const all = Array.from(choicesGrid.querySelectorAll("button"));
    const correctBtn = all.find(b => Number(b.dataset.idx) === Number(data.a));
    if (correctBtn) correctBtn.classList.add("correct");

    // Show explanation if available (for conflict-related questions)
    if (data.explanation && data.sources) {
      setTimeout(() => {
        showExplanation(data);
      }, 800);
      
      // End game after showing explanation
      setTimeout(() => {
        endGame();
      }, 8000); // Give time to read
    } else {
      setTimeout(() => {
        endGame();
      }, 1500);
    }
  }
}

// ==================== SHOW EXPLANATION ====================
function showExplanation(questionData) {
  const explanationBox = document.getElementById('explanationBox');
  const explanationContent = document.getElementById('explanationContent');
  const explanationSources = document.getElementById('explanationSources');
  
  if (!explanationBox || !questionData.explanation) return;
  
  // Set explanation text
  explanationContent.textContent = questionData.explanation;
  
  // Build sources links
  if (questionData.sources && questionData.sources.length > 0) {
    let sourcesHTML = '<h4>📖 Fonti per approfondire:</h4>';
    questionData.sources.forEach(source => {
      const domain = new URL(source.url).hostname.replace('www.', '');
      sourcesHTML += `
        <a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-link">
          <span class="source-icon">🔗</span>
          <div class="source-text">
            <div class="source-title">${source.title}</div>
            <div class="source-url">${domain}</div>
          </div>
        </a>
      `;
    });
    explanationSources.innerHTML = sourcesHTML;
  } else {
    explanationSources.innerHTML = '';
  }
  
  // Show the box
  explanationBox.style.display = 'block';
  
  // Show toast
  showToast("📚 Scopri di più su questo argomento!", "info");
}

// ==================== END GAME ====================
async function endGame() {
  gameScreen.style.display = "none";
  overScreen.style.display = "block";
  
  const finalScoreValue = Math.floor(score);
  finalScore.textContent = finalScoreValue;
  
  // Update stats
  document.getElementById('correctAnswers').textContent = correctAnswers;
  document.getElementById('maxStreak').textContent = maxStreak;
  
  // Performance message
  let message = "";
  if (score === currentQuestions.length) {
    message = "Perfetto! 🌟";
    sounds.complete();
    createConfetti();
  } else if (score >= currentQuestions.length * 0.8) {
    message = "Eccellente! 🎉";
    sounds.complete();
  } else if (score >= currentQuestions.length * 0.5) {
    message = "Buon lavoro! 👍";
    sounds.correct();
  } else {
    message = "Continua così! 💪";
  }
  
  showToast(message, "success");

  // Save to database
  if (currentDifficulty && supabaseClient) {
    await saveScore(finalScoreValue);
  }
  
  // Update local stats
  updateStats(finalScoreValue, currentDifficulty, selectedCategories);
  
  await renderLeaderboards();
}

// ==================== SAVE SCORE ====================
async function saveScore(finalScoreValue) {
  try {
    const { data, error } = await supabaseClient
      .from('Classifica')
      .insert([
        { 
          nome: playerName, 
          punteggio: finalScoreValue, 
          difficoltà: currentDifficulty 
        }
      ]);

    if (error) {
      console.error('Errore salvataggio punteggio:', error);
    }
  } catch (err) {
    console.error('Errore connessione database:', err);
  }
}

// ==================== RENDER LEADERBOARDS ====================
async function renderLeaderboards() {
  if (!supabaseClient) {
    console.error('Client Supabase non inizializzato');
    return;
  }

  const difficulties = ["easy", "medium", "hard"];
  
  for (const diff of difficulties) {
    const el = document.getElementById(`lb-${diff}`);
    if (!el) continue;

    try {
      const { data, error } = await supabaseClient
        .from('Classifica')
        .select('nome, punteggio')
        .eq('difficoltà', diff)
        .order('punteggio', { ascending: false })
        .limit(10);

      if (error) {
        console.error(`Errore caricamento classifica ${diff}:`, error);
        el.innerHTML = '<li class="empty">Errore caricamento</li>';
        continue;
      }

      if (!data || data.length === 0) {
        el.innerHTML = '<li class="empty">Nessun punteggio</li>';
      } else {
        el.innerHTML = data
          .map(p => `<li data-score="${p.punteggio}"><strong>${escapeHtml(p.nome)}</strong></li>`)
          .join("");
      }
    } catch (err) {
      console.error(`Errore rendering ${diff}:`, err);
      el.innerHTML = '<li class="empty">Errore caricamento</li>';
    }
  }
}

// ==================== LEADERBOARD TABS ====================
const lbTabs = document.querySelectorAll('.lb-tab');
lbTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    sounds.click();
    const targetDiff = tab.dataset.tab;
    
    lbTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    document.querySelectorAll('.leaderboard-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const targetContent = document.querySelector(`.leaderboard-content[data-diff="${targetDiff}"]`);
    if (targetContent) {
      targetContent.classList.add('active');
    }
  });
});

// ==================== GAME OVER BUTTONS ====================
btnGiveUp.addEventListener("click", () => {
  sounds.click();
  if (confirm("Sei sicuro di voler abbandonare?")) {
    endGame();
  }
});

btnBack.addEventListener("click", async () => {
  sounds.click();
  overScreen.style.display = "none";
  gameScreen.style.display = "none";
  startScreen.style.display = "block";

  await renderLeaderboards();
});

btnReplay.addEventListener("click", () => {
  sounds.click();
  overScreen.style.display = "none";
  btnStart.click();
});

btnShare.addEventListener("click", () => {
  sounds.click();
  const text = `Ho fatto ${Math.floor(score)} punti su Quiz for Peace! 🎯 Riesci a fare di meglio?`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Quiz for Peace',
      text: text
    }).catch(() => {});
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      showToast("Testo copiato negli appunti!", "success");
    });
  }
});

// ==================== INITIALIZATION ====================
loadSettings();
renderLeaderboards();
updateQuestionsCount();

// Show welcome message
setTimeout(() => {
  showToast("Benvenuto! Inizia a giocare 🎮", "info");
}, 500);