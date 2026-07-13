(function () {
  const appShell = document.getElementById("app-shell");
  const mainMenu = document.getElementById("main-menu");
  const levelSelectScreen = document.getElementById("level-select-screen");
  const vocabularyScreen = document.getElementById("vocabulary-screen");
  const levelCompleteScreen = document.getElementById("level-complete-screen");
  const playButton = document.getElementById("play-button");
  const continueButton = document.getElementById("continue-button");
  const characterSelectButton = document.getElementById("character-select-button");
  const menuCharacterPreview = document.getElementById("menu-character-preview");
  const characterSelectOverlay = document.getElementById("character-select-overlay");
  const characterOptionButtons = Array.from(document.querySelectorAll("[data-character-id]"));
  const confirmCharacterSelectButton = document.getElementById("confirm-character-select");
  const cancelCharacterSelectButton = document.getElementById("cancel-character-select");
  const closeCharacterSelectXButton = document.getElementById("close-character-select-x");
  const settingsButtons = Array.from(document.querySelectorAll("[data-open-settings]"));
  const settingsOverlay = document.getElementById("settings-overlay");
  const closeSettingsButton = document.getElementById("close-settings");
  const closeSettingsXButton = document.getElementById("close-settings-x");
  const audioVolumeInputs = Array.from(document.querySelectorAll("[data-audio-volume]"));
  const audioVolumeOutputs = Array.from(document.querySelectorAll("[data-audio-output]"));
  const levelGrid = document.getElementById("level-grid");
  const unlockedLevelCount = document.getElementById("unlocked-level-count");
  const levelSelectBackButton = document.getElementById("level-select-back-button");
  const levelSelectStartButton = document.getElementById("level-select-start-button");
  const startLevelButton = document.getElementById("start-level-button");
  const nextLevelButton = document.getElementById("next-level-button");
  const completeLevelSelectButton = document.getElementById("complete-level-select-button");
  const completeMainMenuButton = document.getElementById("complete-main-menu-button");
  const levelCompleteTitle = document.getElementById("level-complete-title");
  const vocabularyTitle = document.getElementById("vocabulary-title");
  const vocabularyDescription = document.getElementById("vocabulary-description");
  const vocabularyList = document.getElementById("vocabulary-list");
  const levelLoading = document.getElementById("level-loading");
  const levelLoadingTrack = document.getElementById("level-loading-track");
  const levelLoadingFill = document.getElementById("level-loading-fill");
  const levelLoadingPercent = document.getElementById("level-loading-percent");
  const levelLoadingStatus = document.getElementById("level-loading-status");
  const learnedVocabularyList = document.getElementById("learned-vocabulary-list");
  const levelSummary = document.getElementById("level-summary");
  const player = document.getElementById("player");
  const playerAvatar = document.getElementById("player-avatar");
  const sceneLayer = document.getElementById("scene-layer");
  const prompt = document.getElementById("interaction-prompt");
  const controlDefaultHint = document.getElementById("control-default-hint");
  const dialogOverlay = document.getElementById("dialog-overlay");
  const dialogPanel = dialogOverlay.querySelector(".dialog");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogPortraitCard = document.getElementById("dialog-portrait-card");
  const dialogPortrait = document.getElementById("dialog-portrait");
  const dialogPortraitCaption = document.getElementById("dialog-portrait-caption");
  const dialogSpeakerName = document.getElementById("dialog-speaker-name");
  const dialogLine = document.getElementById("vendor-line");
  const dialogItemSection = document.getElementById("dialog-item-section");
  const dialogItemOptions = document.getElementById("dialog-item-options");
  const freeTextAnswer = document.getElementById("free-text-answer");
  const answerInput = document.getElementById("answer-input");
  const wordOrderSection = document.getElementById("word-order-section");
  const wordOrderAnswer = document.getElementById("word-order-answer");
  const wordOrderBank = document.getElementById("word-order-bank");
  const resetWordOrderButton = document.getElementById("reset-word-order");
  const sentenceGapSection = document.getElementById("sentence-gap-section");
  const sentenceGapSentence = document.getElementById("sentence-gap-sentence");
  const sentenceGapBankWrap = document.getElementById("sentence-gap-bank-wrap");
  const sentenceGapBank = document.getElementById("sentence-gap-bank");
  const resetSentenceGapButton = document.getElementById("reset-sentence-gap");
  const feedbackMessage = document.getElementById("feedback-message");
  const hintContent = document.getElementById("hint-content");
  const submitButton = document.getElementById("submit-answer");
  const helpButton = document.getElementById("help-button");
  const closeDialogButton = document.getElementById("close-dialog");
  const closeDialogXButton = document.getElementById("close-dialog-x");
  const xpValue = document.getElementById("xp-value");
  const xpFill = document.getElementById("xp-fill");
  const levelValue = document.getElementById("level-value");
  const environmentTitle = document.getElementById("environment-title");
  const questTitle = document.getElementById("quest-title");
  const questlogCurrent = document.getElementById("questlog-current");
  const inventoryList = document.getElementById("inventory-list");
  const world = document.getElementById("world");
  const newEnvironmentButton = document.getElementById("new-environment-button");
  const newQuestButton = document.getElementById("new-quest-button");
  const vocabularyButton = document.getElementById("vocabulary-button");
  const vocabularyOverlay = document.getElementById("vocabulary-overlay");
  const vocabularyJournalCount = document.getElementById("vocabulary-journal-count");
  const vocabularyJournalList = document.getElementById("vocabulary-journal-list");
  const closeVocabularyButton = document.getElementById("close-vocabulary");
  const closeVocabularyXButton = document.getElementById("close-vocabulary-x");
  const sidequestButton = document.getElementById("sidequest-button");
  const sidequestOverlay = document.getElementById("sidequest-overlay");
  const sidequestTitle = document.getElementById("sidequest-title");
  const sidequestQuestion = document.getElementById("sidequest-question");
  const sidequestOptions = document.getElementById("sidequest-options");
  const sidequestFeedback = document.getElementById("sidequest-feedback");
  const closeSidequestButton = document.getElementById("close-sidequest");
  const closeSidequestXButton = document.getElementById("close-sidequest-x");
  const audioElements = Object.freeze({
    click: document.getElementById("audio-click"),
    menuMusic: document.getElementById("audio-main-menu"),
    gameplayMusic: document.getElementById("audio-gameplay"),
    levelComplete: document.getElementById("audio-level-complete")
  });

  let activeLevel = null;
  let activeTaskIndex = 0;
  let selectedCatalogLevel = null;
  let currentCatalogLevel = null;
  let levelLoadingTimer = null;
  let levelLoadingProgress = 0;

  const characterAssets = window.CHARACTER_ASSETS || {};

  const playerCharacterAssets = Object.freeze({
    m: Object.freeze({
      id: "m",
      label: "Männlicher Charakter",
      idle: "/assets/characters/main_character_m_Idle.png",
      portrait: "/assets/characters/main_character_m_Portrait.png"
    }),
    w: Object.freeze({
      id: "w",
      label: "Weiblicher Charakter",
      idle: "/assets/characters/main_character_w_Idle.png",
      portrait: "/assets/characters/main_character_w_Portrait.png"
    })
  });
  const playerCharacterStorageKey = "spanishStreetQuestCharacterV1";
  let selectedPlayerCharacterId = "m";
  let pendingPlayerCharacterId = "m";

  const buildingAssets = window.BUILDING_ASSETS || {};
  const worldAssetScale = 1.3;

  const levelCatalog = Array.isArray(window.LEVEL_CATALOG) ? window.LEVEL_CATALOG : [];
  const progressStorageKey = "spanishStreetQuestProgressV1";
  const audioSettingsStorageKey = "spanishStreetQuestAudioV1";
  const defaultAudioSettings = Object.freeze({
    master: 1,
    click: 0.45,
    menuMusic: 0.35,
    gameplayMusic: 0.3,
    levelComplete: 0.7
  });
  let hasSavedProgress = false;
  let progress = createDefaultProgress();
  let audioSettings = { ...defaultAudioSettings };
  let activeMusicScene = "menu";
  let audioUnlocked = false;
  let levelCompleteSoundPlaying = false;
  let settingsReturnFocus = null;

  const state = {
    gameStarted: false,
    playerX: 120,
    cameraX: 0,
    worldWidth: 2600,
    speed: 6,
    xp: 0,
    inventory: [],
    keys: new Set(),
    dialogOpen: false,
    sidequestOpen: false,
    vocabularyOpen: false,
    characterSelectOpen: false,
    settingsOpen: false,
    activeDialogTarget: null,
    activeSidequest: null,
    lastUserAnswer: null,
    hintLevel: 1,
    selectedDialogItemId: null,
    wordOrderTaskId: null,
    wordOrderTiles: [],
    wordOrderAnswerIds: [],
    wordOrderBankIds: [],
    sentenceGapTaskId: null,
    sentenceGapTiles: [],
    sentenceGapSlotIds: [],
    sentenceGapBankIds: [],
    itemImageCache: new Map(),
    itemChoiceCache: new Map(),
    levelStatus: "idle",
    levelLoadFailed: false,
    recentScenarioIds: [],
    recentTaskIntents: [],
    xpAwardKeys: new Set(),
    completedSidequests: new Set()
  };

  function createDefaultProgress() {
    return {
      version: 1,
      unlockedLevel: 1,
      completedLevelIds: [],
      xp: 0,
      scenarioHistory: {},
      playCounts: {},
      learnedVocabulary: []
    };
  }

  function normalizeVolume(value, fallback) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.max(0, Math.min(numericValue, 1)) : fallback;
  }

  function loadAudioSettings() {
    try {
      const savedSettings = JSON.parse(window.localStorage.getItem(audioSettingsStorageKey) || "null");

      if (!savedSettings || typeof savedSettings !== "object") {
        return { ...defaultAudioSettings };
      }

      return Object.fromEntries(
        Object.entries(defaultAudioSettings).map(([key, fallback]) => [
          key,
          normalizeVolume(savedSettings[key], fallback)
        ])
      );
    } catch (error) {
      console.warn("Die Audioeinstellungen konnten nicht gelesen werden.", error);
      return { ...defaultAudioSettings };
    }
  }

  function saveAudioSettings() {
    try {
      window.localStorage.setItem(audioSettingsStorageKey, JSON.stringify(audioSettings));
    } catch (error) {
      console.warn("Die Audioeinstellungen konnten nicht gespeichert werden.", error);
    }
  }

  function tryPlayAudio(audioElement, onFailure = null) {
    const playResult = audioElement.play();

    if (playResult && typeof playResult.catch === "function") {
      playResult.catch(() => onFailure?.());
    }
  }

  function syncBackgroundMusic() {
    const selectedMusic = activeMusicScene === "menu" ? audioElements.menuMusic : audioElements.gameplayMusic;
    const pausedMusic = activeMusicScene === "menu" ? audioElements.gameplayMusic : audioElements.menuMusic;
    pausedMusic.pause();

    if (!audioUnlocked || levelCompleteSoundPlaying || selectedMusic.volume === 0) {
      selectedMusic.pause();
      return;
    }

    tryPlayAudio(selectedMusic);
  }

  function setMusicScene(scene) {
    activeMusicScene = scene === "menu" ? "menu" : "gameplay";
    syncBackgroundMusic();
  }

  function finishLevelCompleteSound() {
    if (!levelCompleteSoundPlaying) {
      return;
    }

    levelCompleteSoundPlaying = false;
    syncBackgroundMusic();
  }

  function playLevelCompleteSound() {
    const sound = audioElements.levelComplete;

    if (!audioUnlocked || sound.volume === 0) {
      return;
    }

    levelCompleteSoundPlaying = true;
    audioElements.menuMusic.pause();
    audioElements.gameplayMusic.pause();
    sound.pause();
    sound.currentTime = 0;
    tryPlayAudio(sound, finishLevelCompleteSound);
  }

  function renderAudioSettings() {
    audioVolumeInputs.forEach((input) => {
      const settingKey = input.dataset.audioVolume;
      const percentage = Math.round((audioSettings[settingKey] || 0) * 100);
      input.value = String(percentage);
      input.style.setProperty("--volume-fill", `${percentage}%`);
    });

    audioVolumeOutputs.forEach((output) => {
      const settingKey = output.dataset.audioOutput;
      const percentage = Math.round((audioSettings[settingKey] || 0) * 100);
      output.value = `${percentage} %`;
      output.textContent = `${percentage} %`;
    });
  }

  function applyAudioSettings() {
    Object.entries(audioElements).forEach(([key, audioElement]) => {
      audioElement.volume = normalizeVolume(audioSettings.master * audioSettings[key], 0);
    });
    renderAudioSettings();

    if (levelCompleteSoundPlaying && audioElements.levelComplete.volume === 0) {
      audioElements.levelComplete.pause();
      finishLevelCompleteSound();
      return;
    }

    syncBackgroundMusic();
  }

  function handleAudioVolumeInput(input) {
    const settingKey = input.dataset.audioVolume;

    if (!Object.hasOwn(defaultAudioSettings, settingKey)) {
      return;
    }

    audioSettings[settingKey] = normalizeVolume(Number(input.value) / 100, defaultAudioSettings[settingKey]);
    applyAudioSettings();
    saveAudioSettings();
  }

  function openSettings(triggerButton) {
    if (state.dialogOpen || state.sidequestOpen || state.vocabularyOpen || state.characterSelectOpen) {
      return;
    }

    settingsReturnFocus = triggerButton;
    state.settingsOpen = true;
    state.keys.clear();
    renderAudioSettings();
    settingsOverlay.hidden = false;
    updateInteractionPrompt();
    audioVolumeInputs[0]?.focus();
  }

  function closeSettings() {
    state.settingsOpen = false;
    settingsOverlay.hidden = true;
    updateInteractionPrompt();

    if (settingsReturnFocus?.isConnected) {
      settingsReturnFocus.focus();
    }

    settingsReturnFocus = null;
  }

  function handleDocumentAudioClick(event) {
    if (!event.isTrusted) {
      return;
    }

    audioUnlocked = true;

    if (!levelCompleteSoundPlaying && audioElements.click.volume > 0) {
      audioElements.click.pause();
      audioElements.click.currentTime = 0;
      tryPlayAudio(audioElements.click);
    }

    syncBackgroundMusic();
  }

  function getPlayerCharacter(characterId) {
    return playerCharacterAssets[characterId] || playerCharacterAssets.m;
  }

  function loadPlayerCharacterPreference() {
    try {
      const savedCharacterId = window.localStorage.getItem(playerCharacterStorageKey);
      return playerCharacterAssets[savedCharacterId] ? savedCharacterId : "m";
    } catch (error) {
      console.warn("Die Charakterauswahl konnte nicht gelesen werden.", error);
      return "m";
    }
  }

  function savePlayerCharacterPreference(characterId) {
    try {
      window.localStorage.setItem(playerCharacterStorageKey, characterId);
    } catch (error) {
      console.warn("Die Charakterauswahl konnte nicht gespeichert werden.", error);
    }
  }

  function applyPlayerCharacter(characterId, persistSelection = false) {
    const character = getPlayerCharacter(characterId);
    selectedPlayerCharacterId = character.id;
    pendingPlayerCharacterId = character.id;
    player.dataset.characterId = character.id;
    player.style.backgroundImage = `url("${character.idle}")`;
    player.setAttribute("aria-label", character.label);
    playerAvatar.src = character.portrait;
    playerAvatar.alt = `Portrait: ${character.label}`;
    menuCharacterPreview.style.backgroundImage = `url("${character.portrait}")`;

    if (persistSelection) {
      savePlayerCharacterPreference(character.id);
    }
  }

  function renderCharacterSelection() {
    const character = getPlayerCharacter(pendingPlayerCharacterId);

    characterOptionButtons.forEach((button) => {
      const isSelected = button.dataset.characterId === character.id;
      button.setAttribute("aria-pressed", String(isSelected));
    });

  }

  function openCharacterSelection() {
    pendingPlayerCharacterId = selectedPlayerCharacterId;
    state.characterSelectOpen = true;
    state.keys.clear();
    renderCharacterSelection();
    characterSelectOverlay.hidden = false;

    const selectedOption = characterOptionButtons.find(
      (button) => button.dataset.characterId === pendingPlayerCharacterId
    );
    selectedOption?.focus();
  }

  function closeCharacterSelection() {
    pendingPlayerCharacterId = selectedPlayerCharacterId;
    state.characterSelectOpen = false;
    characterSelectOverlay.hidden = true;

    if (!mainMenu.hidden) {
      characterSelectButton.focus();
    }
  }

  function confirmCharacterSelection() {
    applyPlayerCharacter(pendingPlayerCharacterId, true);
    closeCharacterSelection();
  }

  function getVocabularyKey(spanishWord) {
    return String(spanishWord || "")
      .trim()
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function sanitizeLearnedVocabulary(entries) {
    const vocabulary = [];
    const seenWords = new Set();

    for (const entry of Array.isArray(entries) ? entries.slice(0, 200) : []) {
      const de = String(entry?.de || "").trim().slice(0, 80);
      const es = String(entry?.es || "").trim().slice(0, 80);
      const vocabularyKey = getVocabularyKey(es);

      if (!de || !es || !vocabularyKey || seenWords.has(vocabularyKey)) {
        continue;
      }

      seenWords.add(vocabularyKey);
      vocabulary.push({
        de,
        es,
        levelNumber: Math.max(1, Math.min(Math.round(Number(entry.levelNumber) || 1), levelCatalog.length || 1))
      });
    }

    return vocabulary;
  }

  function sanitizeProgress(savedProgress) {
    const fallback = createDefaultProgress();

    if (!savedProgress || typeof savedProgress !== "object" || levelCatalog.length === 0) {
      return fallback;
    }

    const validLevelIds = new Set(levelCatalog.map((level) => level.id));
    const validScenarioIds = new Set(levelCatalog.map((level) => level.scenarioId));
    const completedLevelIds = Array.isArray(savedProgress.completedLevelIds)
      ? [...new Set(savedProgress.completedLevelIds.filter((levelId) => validLevelIds.has(levelId)))]
      : [];
    const scenarioHistory = {};

    for (const [scenarioId, intents] of Object.entries(savedProgress.scenarioHistory || {})) {
      if (!validScenarioIds.has(scenarioId) || !Array.isArray(intents)) {
        continue;
      }

      scenarioHistory[scenarioId] = intents
        .map((intent) => String(intent || "").trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 12);
    }

    const playCounts = {};

    for (const [levelId, count] of Object.entries(savedProgress.playCounts || {})) {
      if (validLevelIds.has(levelId)) {
        playCounts[levelId] = Math.max(0, Math.min(Math.round(Number(count) || 0), 999));
      }
    }

    return {
      version: 1,
      unlockedLevel: Math.max(
        1,
        Math.min(Math.round(Number(savedProgress.unlockedLevel) || 1), levelCatalog.length)
      ),
      completedLevelIds,
      xp: Math.max(0, Math.min(Math.round(Number(savedProgress.xp) || 0), 100)),
      scenarioHistory,
      playCounts,
      learnedVocabulary: sanitizeLearnedVocabulary(savedProgress.learnedVocabulary)
    };
  }

  function updateXpDisplay() {
    xpValue.textContent = `${state.xp}/100 XP`;

    if (xpFill) {
      xpFill.style.width = `${state.xp}%`;
    }
  }

  function updateContinueButton() {
    continueButton.disabled = !hasSavedProgress;
    continueButton.title = hasSavedProgress ? "Gespeicherten Fortschritt fortsetzen" : "Noch kein Spielstand vorhanden";
  }

  function loadProgress() {
    try {
      const savedValue = window.localStorage.getItem(progressStorageKey);
      hasSavedProgress = Boolean(savedValue);
      progress = savedValue ? sanitizeProgress(JSON.parse(savedValue)) : createDefaultProgress();
    } catch (error) {
      console.warn("Der gespeicherte Fortschritt konnte nicht gelesen werden.", error);
      hasSavedProgress = false;
      progress = createDefaultProgress();
    }

    state.xp = progress.xp;
    updateXpDisplay();
    updateContinueButton();
  }

  function saveProgress() {
    progress.xp = state.xp;

    try {
      window.localStorage.setItem(progressStorageKey, JSON.stringify(progress));
      hasSavedProgress = true;
    } catch (error) {
      console.warn("Der Fortschritt konnte nicht gespeichert werden.", error);
    }

    updateContinueButton();
  }

  function getCatalogLevelByNumber(levelNumber) {
    return levelCatalog.find((level) => level.number === Number(levelNumber)) || null;
  }

  function isCatalogLevelCompleted(level) {
    return Boolean(level && progress.completedLevelIds.includes(level.id));
  }

  function isCatalogLevelUnlocked(level) {
    return Boolean(level && level.number <= progress.unlockedLevel);
  }

  function hideGameScreens() {
    hideLevelLoading();
    mainMenu.hidden = true;
    levelSelectScreen.hidden = true;
    vocabularyScreen.hidden = true;
    levelCompleteScreen.hidden = true;
    appShell.hidden = true;
    dialogOverlay.hidden = true;
    sidequestOverlay.hidden = true;
    vocabularyOverlay.hidden = true;
    characterSelectOverlay.hidden = true;
    settingsOverlay.hidden = true;
    state.vocabularyOpen = false;
    state.characterSelectOpen = false;
    state.settingsOpen = false;
  }

  function showMainMenu() {
    hideGameScreens();
    mainMenu.hidden = false;
    state.gameStarted = false;
    state.dialogOpen = false;
    state.sidequestOpen = false;
    state.keys.clear();
    updateContinueButton();
    setMusicScene("menu");
  }

  function selectCatalogLevel(level) {
    if (!isCatalogLevelUnlocked(level)) {
      return;
    }

    selectedCatalogLevel = level;
    renderLevelSelection();
  }

  function renderLevelSelection() {
    const completedLevelIds = new Set(progress.completedLevelIds);
    const unlockedCount = Math.min(progress.unlockedLevel, levelCatalog.length);
    unlockedLevelCount.textContent = `${unlockedCount} / ${levelCatalog.length}`;
    levelGrid.innerHTML = "";

    levelCatalog.forEach((level) => {
      const isCompleted = completedLevelIds.has(level.id);
      const isUnlocked = isCatalogLevelUnlocked(level);
      const isSelected = selectedCatalogLevel?.id === level.id;
      const isCurrent = isUnlocked && !isCompleted && level.number === progress.unlockedLevel;
      const buildingAsset = buildingAssets[level.buildingId];
      const card = document.createElement("button");
      card.type = "button";
      card.className = [
        "level-card",
        isCompleted ? "level-card--completed" : "",
        isSelected ? "level-card--selected" : "",
        isUnlocked ? "" : "level-card--locked"
      ].filter(Boolean).join(" ");
      card.disabled = !isUnlocked;
      card.setAttribute(
        "aria-label",
        `Level ${level.number}: ${level.titleGerman}. ${isCompleted ? "Abgeschlossen" : isUnlocked ? "Freigeschaltet" : "Gesperrt"}.`
      );

      const number = document.createElement("span");
      number.className = "level-card__number";
      number.textContent = level.number;
      card.appendChild(number);

      if (isCurrent) {
        const currentLabel = document.createElement("span");
        currentLabel.className = "level-card__current";
        currentLabel.textContent = "Aktuelles Level";
        card.appendChild(currentLabel);
      }

      const imageWrap = document.createElement("span");
      imageWrap.className = "level-card__image-wrap";

      if (buildingAsset?.src) {
        const image = document.createElement("img");
        image.className = "level-card__image";
        image.src = buildingAsset.src;
        image.alt = "";
        imageWrap.appendChild(image);
      }

      card.appendChild(imageWrap);

      const title = document.createElement("strong");
      title.className = "level-card__title";
      title.textContent = level.titleGerman;
      card.appendChild(title);

      const status = document.createElement("span");
      status.className = "level-card__status";
      status.textContent = isCompleted ? "Abgeschlossen" : isUnlocked ? "Freigeschaltet" : "Gesperrt";
      card.appendChild(status);
      card.addEventListener("click", () => selectCatalogLevel(level));
      levelGrid.appendChild(card);
    });

    levelSelectStartButton.disabled = !selectedCatalogLevel || !isCatalogLevelUnlocked(selectedCatalogLevel);
    levelSelectStartButton.textContent = isCatalogLevelCompleted(selectedCatalogLevel)
      ? "Level erneut spielen"
      : "Level starten";
  }

  function showLevelSelection(preferredLevelNumber = progress.unlockedLevel) {
    hideGameScreens();
    levelSelectScreen.hidden = false;
    state.gameStarted = false;
    state.dialogOpen = false;
    state.sidequestOpen = false;
    state.keys.clear();
    setMusicScene("gameplay");

    const preferredLevel = getCatalogLevelByNumber(preferredLevelNumber);
    selectedCatalogLevel = isCatalogLevelUnlocked(preferredLevel)
      ? preferredLevel
      : getCatalogLevelByNumber(progress.unlockedLevel) || levelCatalog[0] || null;
    renderLevelSelection();
  }

  function startNewGame() {
    progress = createDefaultProgress();
    state.xp = 0;
    state.inventory = [];
    state.xpAwardKeys.clear();
    state.completedSidequests.clear();
    state.recentScenarioIds = [];
    state.recentTaskIntents = [];
    activeLevel = null;
    currentCatalogLevel = null;
    renderInventory();
    updateXpDisplay();
    saveProgress();
    showLevelSelection(1);
  }

  function getActiveTask() {
    return activeLevel ? activeLevel.tasks[activeTaskIndex] : null;
  }

  function getCharacterAssetForTask(task) {
    return task ? characterAssets[task.npcId] || null : null;
  }

  function getBuildingAssetForLocation(location) {
    if (!location) {
      return null;
    }

    return buildingAssets[location.id] || null;
  }

  function getLocationDisplayWidth(location) {
    const baseWidth = getBuildingAssetForLocation(location)?.width || Number(location?.width) || 150;
    return Math.round(baseWidth * worldAssetScale);
  }

  function getWorldPixelWidth() {
    return Math.max(2600, world.clientWidth * 2.6);
  }

  function worldUnitsToPixels(value) {
    return (Number(value) / 1000) * state.worldWidth;
  }

  function updateWorldMetrics(preservePlayerRatio = true) {
    const previousWidth = state.worldWidth || getWorldPixelWidth();
    const playerRatio = previousWidth > 0 ? state.playerX / previousWidth : 0;

    state.worldWidth = getWorldPixelWidth();
    sceneLayer.style.width = `${state.worldWidth}px`;

    if (preservePlayerRatio) {
      state.playerX = playerRatio * state.worldWidth;
    }
  }

  function renderVocabularyList(container, vocabulary) {
    container.innerHTML = "";

    vocabulary.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "vocabulary-card";

      const title = document.createElement("strong");
      title.textContent = `${entry.de} = ${entry.es}`;
      card.appendChild(title);

      const spanishExample = document.createElement("p");
      spanishExample.textContent = entry.exampleSpanish;
      card.appendChild(spanishExample);

      const germanExample = document.createElement("p");
      germanExample.textContent = entry.exampleGerman;
      card.appendChild(germanExample);

      container.appendChild(card);
    });
  }

  function rememberLevelVocabulary(vocabulary) {
    const learnedVocabulary = sanitizeLearnedVocabulary(progress.learnedVocabulary);
    const knownWords = new Set(learnedVocabulary.map((entry) => getVocabularyKey(entry.es)));
    const levelNumber = currentCatalogLevel?.number || 1;
    let vocabularyAdded = false;

    for (const entry of Array.isArray(vocabulary) ? vocabulary : []) {
      const de = String(entry?.de || "").trim().slice(0, 80);
      const es = String(entry?.es || "").trim().slice(0, 80);
      const vocabularyKey = getVocabularyKey(es);

      if (!de || !es || !vocabularyKey || knownWords.has(vocabularyKey)) {
        continue;
      }

      learnedVocabulary.push({ de, es, levelNumber });
      knownWords.add(vocabularyKey);
      vocabularyAdded = true;
    }

    progress.learnedVocabulary = learnedVocabulary.slice(0, 200);

    if (vocabularyAdded) {
      saveProgress();
    }
  }

  function renderVocabularyJournal() {
    const learnedVocabulary = sanitizeLearnedVocabulary(progress.learnedVocabulary)
      .sort((firstEntry, secondEntry) => firstEntry.es.localeCompare(secondEntry.es, "es", {
        sensitivity: "base"
      }));

    vocabularyJournalList.innerHTML = "";
    vocabularyJournalCount.textContent = learnedVocabulary.length === 1
      ? "1 Vokabel gesammelt"
      : `${learnedVocabulary.length} Vokabeln gesammelt`;

    if (learnedVocabulary.length === 0) {
      const emptyMessage = document.createElement("li");
      emptyMessage.className = "vocabulary-journal__empty";
      emptyMessage.textContent = "Noch keine Vokabeln gesammelt. Starte dein erstes Level, um Wörter freizuschalten.";
      vocabularyJournalList.appendChild(emptyMessage);
      return;
    }

    learnedVocabulary.forEach((entry) => {
      const listItem = document.createElement("li");
      listItem.className = "vocabulary-journal__item";

      const spanishWord = document.createElement("strong");
      spanishWord.className = "vocabulary-journal__spanish";
      spanishWord.lang = "es";
      spanishWord.textContent = entry.es;

      const germanWord = document.createElement("span");
      germanWord.className = "vocabulary-journal__german";
      germanWord.textContent = entry.de;

      const levelBadge = document.createElement("span");
      levelBadge.className = "vocabulary-journal__level";
      levelBadge.textContent = `Level ${entry.levelNumber}`;

      listItem.append(spanishWord, germanWord, levelBadge);
      vocabularyJournalList.appendChild(listItem);
    });
  }

  function openVocabularyJournal() {
    if (state.dialogOpen || state.sidequestOpen) {
      return;
    }

    renderVocabularyJournal();
    state.vocabularyOpen = true;
    state.keys.clear();
    vocabularyOverlay.hidden = false;
    updateInteractionPrompt();
    closeVocabularyXButton.focus();
  }

  function closeVocabularyJournal() {
    state.vocabularyOpen = false;
    vocabularyOverlay.hidden = true;
    updateInteractionPrompt();

    if (!appShell.hidden) {
      vocabularyButton.focus();
    }
  }

  function clearLevelLoadingTimer() {
    if (levelLoadingTimer !== null) {
      window.clearInterval(levelLoadingTimer);
      levelLoadingTimer = null;
    }
  }

  function setLevelLoadingProgress(value) {
    levelLoadingProgress = Math.max(0, Math.min(Number(value) || 0, 100));
    const roundedProgress = Math.round(levelLoadingProgress);
    levelLoadingFill.style.width = `${levelLoadingProgress}%`;
    levelLoadingPercent.textContent = `${roundedProgress}%`;
    levelLoadingTrack.setAttribute("aria-valuenow", String(roundedProgress));
  }

  function updateLevelLoadingStatus() {
    if (levelLoadingProgress < 35) {
      levelLoadingStatus.textContent = "Szenario wird aufgebaut...";
      return;
    }

    if (levelLoadingProgress < 70) {
      levelLoadingStatus.textContent = "Aufgaben werden erstellt...";
      return;
    }

    levelLoadingStatus.textContent = "Vokabeln und Dialoge werden abgestimmt...";
  }

  function startLevelLoading() {
    clearLevelLoadingTimer();
    levelLoading.hidden = false;
    setLevelLoadingProgress(6);
    updateLevelLoadingStatus();

    levelLoadingTimer = window.setInterval(() => {
      const remainingProgress = 92 - levelLoadingProgress;
      const nextIncrement = Math.max(0.6, remainingProgress * 0.08);
      setLevelLoadingProgress(Math.min(92, levelLoadingProgress + nextIncrement));
      updateLevelLoadingStatus();
    }, 350);
  }

  function completeLevelLoading() {
    clearLevelLoadingTimer();
    setLevelLoadingProgress(100);
    levelLoadingStatus.textContent = "Level ist bereit.";
  }

  function hideLevelLoading() {
    clearLevelLoadingTimer();
    levelLoading.hidden = true;
    levelLoadingStatus.textContent = "Szene wird vorbereitet...";
    setLevelLoadingProgress(0);
  }

  function showVocabularyScreen(level) {
    levelSelectScreen.hidden = true;
    appShell.hidden = true;
    levelCompleteScreen.hidden = true;
    vocabularyScreen.hidden = false;
    state.levelLoadFailed = false;
    hideLevelLoading();
    startLevelButton.textContent = "Level starten";
    startLevelButton.hidden = false;
    vocabularyList.hidden = false;
    vocabularyTitle.textContent = currentCatalogLevel
      ? `Level ${currentCatalogLevel.number}: ${level.titleGerman}`
      : level.titleGerman;
    vocabularyDescription.textContent = level.descriptionGerman;
    renderVocabularyList(vocabularyList, level.vocabularyPreview);
  }

  function updateHud() {
    const activeTask = getActiveTask();
    levelValue.textContent = currentCatalogLevel?.number || 1;
    environmentTitle.textContent = activeLevel?.titleGerman || "Noch nicht geladen";
    questTitle.textContent =
      state.levelStatus === "completed"
        ? "Level abgeschlossen"
        : activeTask?.titleGerman || "Noch nicht geladen";

    if (questlogCurrent) {
      questlogCurrent.textContent =
        state.levelStatus === "completed"
          ? activeLevel?.summaryGerman || "Level abgeschlossen."
          : activeTask?.instructionGerman || "Folge der aktuellen Quest und sprich mit der markierten Person.";
    }
  }

  function updateWorldScroll() {
    world.style.setProperty("--bg-scroll", `${-state.cameraX}px`);
  }

  function updatePlayerPosition() {
    const maxX = Math.max(20, state.worldWidth - player.offsetWidth - 20);
    const maxCameraX = Math.max(0, state.worldWidth - world.clientWidth);

    state.playerX = Math.max(20, Math.min(state.playerX, maxX));
    state.cameraX = Math.max(0, Math.min(state.playerX - world.clientWidth * 0.42, maxCameraX));

    sceneLayer.style.transform = `translateX(${-state.cameraX}px)`;
    player.style.transform = `translateX(${state.playerX - state.cameraX}px)`;
    updateWorldScroll();
  }

  function renderLevelScene() {
    const activeTask = getActiveTask();
    const currentTaskOrder = activeTask ? activeTask.order : activeTaskIndex + 1;
    sceneLayer.innerHTML = "";
    world.dataset.theme = activeLevel.backgroundTheme;
    sceneLayer.style.width = `${state.worldWidth}px`;

    activeLevel.locations.forEach((location) => {
      const buildingAsset = getBuildingAssetForLocation(location);

      if (!buildingAsset) {
        console.warn(`Location ${location.id} wird nicht gerendert, weil kein PNG-Asset vorhanden ist.`);
        return;
      }

      const locationElement = document.createElement("div");
      locationElement.className = `dynamic-location dynamic-location--${location.type} dynamic-location--asset`;
      locationElement.dataset.locationId = location.id;
      locationElement.style.left = `${worldUnitsToPixels(location.x)}px`;
      locationElement.style.width = `${getLocationDisplayWidth(location)}px`;

      const image = document.createElement("img");
      image.className = "dynamic-location__asset";
      image.src = buildingAsset.src;
      image.alt = location.labelGerman;
      locationElement.appendChild(image);

      const label = document.createElement("span");
      label.className = "dynamic-location__label";
      label.textContent = location.labelGerman;
      locationElement.appendChild(label);
      sceneLayer.appendChild(locationElement);
    });

    activeLevel.npcs
      .filter((npc) => {
        if (activeTask && npc.id === activeTask.npcId) {
          return true;
        }

        const appearsAtTask = Number(npc.appearsAtTask || 1);
        const leavesAfterTask = npc.leavesAfterTask === null || npc.leavesAfterTask === undefined
          ? Infinity
          : Number(npc.leavesAfterTask);

        return currentTaskOrder >= appearsAtTask && currentTaskOrder <= leavesAfterTask;
      })
      .forEach((npc) => {
        const isActiveNpc = activeTask && npc.id === activeTask.npcId;
        const asset = characterAssets[npc.id] || null;

        if (!asset?.sprite) {
          console.warn(`NPC ${npc.id} wird nicht gerendert, weil kein Idle-Asset vorhanden ist.`);
          return;
        }

        const npcElement = document.createElement("div");
        npcElement.className = `dynamic-npc dynamic-npc--sprite${isActiveNpc ? " dynamic-npc--quest" : ""}`;
        npcElement.dataset.npcId = npc.id;
        npcElement.style.left = `${worldUnitsToPixels(npc.x)}px`;
        npcElement.style.backgroundImage = `url("${asset.sprite}")`;

        const label = document.createElement("span");
        label.className = "dynamic-npc__label";
        label.textContent = npc.nameGerman;
        npcElement.appendChild(label);
        sceneLayer.appendChild(npcElement);
      });
  }

  function removeOldQuestItemsForLevel() {
    state.inventory = state.inventory.filter((item) => !item.questItem);
    renderInventory();
  }

  function rememberGeneratedLevel(level) {
    state.recentScenarioIds = [
      level.scenarioId,
      ...state.recentScenarioIds.filter((scenarioId) => scenarioId !== level.scenarioId)
    ].slice(0, 4);

    const taskIntents = level.tasks
      .map((task) => String(task.expectedIntent || "").trim())
      .filter(Boolean);
    state.recentTaskIntents = [...taskIntents, ...state.recentTaskIntents].slice(0, 8);

    const previousScenarioIntents = progress.scenarioHistory[level.scenarioId] || [];
    progress.scenarioHistory[level.scenarioId] = [
      ...taskIntents,
      ...previousScenarioIntents.filter((intent) => !taskIntents.includes(intent))
    ].slice(0, 12);
    saveProgress();
  }

  function resetLevelState(level) {
    rememberGeneratedLevel(level);
    activeLevel = level;
    activeTaskIndex = 0;
    state.levelStatus = "preview";
    state.dialogOpen = false;
    state.activeDialogTarget = null;
    state.lastUserAnswer = null;
    state.hintLevel = 1;
    state.selectedDialogItemId = null;
    state.itemImageCache.clear();
    state.itemChoiceCache.clear();
    clearWordOrderTask();
    state.cameraX = 0;
    state.playerX = 120;
    dialogOverlay.hidden = true;
    newEnvironmentButton.hidden = true;
    newQuestButton.hidden = true;
    clearHint();
    removeOldQuestItemsForLevel();
    showVocabularyScreen(level);
  }

  async function loadGeneratedLevel(catalogLevel = selectedCatalogLevel || currentCatalogLevel) {
    if (!catalogLevel || !isCatalogLevelUnlocked(catalogLevel)) {
      showLevelSelection();
      return;
    }

    currentCatalogLevel = catalogLevel;
    selectedCatalogLevel = catalogLevel;
    const playCount = (progress.playCounts[catalogLevel.id] || 0) + 1;
    playButton.disabled = true;
    nextLevelButton.disabled = true;
    newEnvironmentButton.disabled = true;
    mainMenu.hidden = true;
    levelSelectScreen.hidden = true;
    appShell.hidden = true;
    levelCompleteScreen.hidden = true;
    vocabularyScreen.hidden = false;
    startLevelButton.hidden = true;
    vocabularyTitle.textContent = `Level ${catalogLevel.number} wird geladen...`;
    vocabularyDescription.textContent = "Eine Szene wird vorbereitet.";
    vocabularyList.innerHTML = "";
    vocabularyList.hidden = true;
    state.levelLoadFailed = false;
    startLevelLoading();

    try {
      const level = await aiClient.generateLevel({
        scenarioId: catalogLevel.scenarioId,
        catalogLevelId: catalogLevel.id,
        levelNumber: catalogLevel.number,
        playCount,
        recentScenarioIds: state.recentScenarioIds,
        recentTaskIntents: progress.scenarioHistory[catalogLevel.scenarioId] || []
      });

      if (level.scenarioId !== catalogLevel.scenarioId) {
        throw new Error(`Das geladene Szenario passt nicht zu Level ${catalogLevel.number}.`);
      }

      completeLevelLoading();
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      progress.playCounts[catalogLevel.id] = playCount;
      resetLevelState(level);
    } catch (error) {
      state.levelLoadFailed = true;
      hideLevelLoading();
      vocabularyDescription.textContent = `Das KI-Level konnte nicht geladen werden. ${error.message}`;
      startLevelButton.textContent = "Erneut versuchen";
      startLevelButton.hidden = false;
      console.error(error);
    } finally {
      playButton.disabled = false;
      nextLevelButton.disabled = false;
      newEnvironmentButton.disabled = false;
    }
  }

  function startLevel() {
    if (!activeLevel) {
      return;
    }

    rememberLevelVocabulary(activeLevel.vocabularyPreview);
    vocabularyScreen.hidden = true;
    appShell.hidden = false;
    state.gameStarted = true;
    state.levelStatus = "active";
    updateWorldMetrics(false);
    state.playerX = worldUnitsToPixels(activeLevel.playerStartX);
    renderLevelScene();
    updateHud();
    updatePlayerPosition();
    updateInteractionPrompt();
  }

  function getTaskNpcElement() {
    const activeTask = getActiveTask();
    return activeTask ? sceneLayer.querySelector(`[data-npc-id="${activeTask.npcId}"]`) : null;
  }

  function getTaskLocationElement() {
    const activeTask = getActiveTask();
    return activeTask ? sceneLayer.querySelector(`[data-location-id="${activeTask.locationId}"]`) : null;
  }

  function getTaskNpc() {
    const activeTask = getActiveTask();
    return activeTask ? activeLevel.npcs.find((npc) => npc.id === activeTask.npcId) : null;
  }

  function getTaskLocation() {
    const activeTask = getActiveTask();
    return activeTask ? activeLevel.locations.find((location) => location.id === activeTask.locationId) : null;
  }

  function isNearWorldPosition(targetX, distance = 130) {
    if (!Number.isFinite(targetX)) {
      return false;
    }

    const playerCenter = state.playerX + player.offsetWidth / 2;
    return Math.abs(playerCenter - targetX) < distance;
  }

  function getNpcWorldCenter(npc) {
    if (!npc) {
      return NaN;
    }

    const npcElement = sceneLayer.querySelector(`[data-npc-id="${npc.id}"]`);
    const npcWidth = npcElement?.offsetWidth || 34;
    return worldUnitsToPixels(npc.x) + npcWidth / 2;
  }

  function getCurrentInteractionTarget() {
    if (!getActiveTask() || state.levelStatus !== "active") {
      return null;
    }

    const taskNpc = getTaskNpc();
    const taskLocation = getTaskLocation();
    const npcElement = getTaskNpcElement();
    const locationElement = getTaskLocationElement();
    const npcCenter = getNpcWorldCenter(taskNpc);
    const locationCenter = taskLocation ? worldUnitsToPixels(taskLocation.x) + getLocationDisplayWidth(taskLocation) / 2 : NaN;

    if (!isNearWorldPosition(npcCenter) && !isNearWorldPosition(locationCenter)) {
      return null;
    }

    return {
      task: getActiveTask(),
      npcElement,
      locationElement
    };
  }

  function updateInteractionPrompt() {
    const canInteract = state.gameStarted
      && !state.dialogOpen
      && !state.sidequestOpen
      && !state.vocabularyOpen
      && !state.settingsOpen
      && Boolean(getCurrentInteractionTarget());

    prompt.hidden = !canInteract;
    controlDefaultHint.hidden = canInteract;
  }

  function renderInventory() {
    inventoryList.innerHTML = "";

    if (state.inventory.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "inventory__empty";
      emptyItem.textContent = "Leer";
      inventoryList.appendChild(emptyItem);
      return;
    }

    state.inventory.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item.label;
      inventoryList.appendChild(listItem);
    });
  }

  function addXp(amount, awardKey) {
    if (!amount || state.xpAwardKeys.has(awardKey)) {
      return false;
    }

    state.xpAwardKeys.add(awardKey);
    state.xp = Math.min(100, state.xp + amount);
    updateXpDisplay();
    saveProgress();
    return true;
  }

  function hasInventoryItem(itemId) {
    return state.inventory.some((item) => item.id === itemId);
  }

  function addInventoryItem(itemId) {
    if (!itemId || hasInventoryItem(itemId)) {
      return;
    }

    const levelItem = activeLevel.items.find((item) => item.id === itemId);
    state.inventory.push({
      id: itemId,
      label: levelItem ? levelItem.nameGerman : itemId,
      questItem: true
    });
    renderInventory();
  }

  function removeInventoryItem(itemId) {
    if (!itemId) {
      return;
    }

    state.inventory = state.inventory.filter((item) => item.id !== itemId);
    renderInventory();
  }

  function buildQuestContext(task) {
    return {
      levelId: activeLevel.levelId,
      scenarioId: activeLevel.scenarioId,
      currentStep: "generated_level_task",
      questStatus: state.levelStatus === "completed" ? "completed" : "active",
      taskId: task.taskId,
      taskOrder: task.order,
      taskType: task.taskType || "free_text",
      sentenceGap: task.sentenceGap || null,
      locationId: task.locationId,
      npcId: task.npcId,
      npcName: task.npcName,
      npcSpanish: task.npcSpanish,
      instructionGerman: task.instructionGerman,
      expectedIntent: task.expectedIntent,
      expectedExamples: task.expectedExamples,
      requiredVocabulary: task.requiredVocabulary,
      rewardItem: task.rewardItem || null,
      requiredItem: task.requiredItem || null,
      removeItemOnSuccess: task.removeItemOnSuccess || null,
      itemSelectionItem: task.itemSelectionItem || null,
      selectedItemId: state.selectedDialogItemId,
      expectedItemId: getExpectedTaskItemId(task),
      vocabulary: activeLevel.vocabularyPreview.map((entry) => ({
        de: entry.de,
        es: entry.es
      }))
    };
  }

  function getExpectedTaskItemId(task) {
    if (!task) {
      return null;
    }

    return task.itemSelectionItem || null;
  }

  function getExpectedTaskItem(task) {
    const expectedItemId = getExpectedTaskItemId(task);

    if (!activeLevel || !expectedItemId) {
      return null;
    }

    return (
      activeLevel.items.find((item) => item.id === expectedItemId) || {
        id: expectedItemId,
        nameGerman: expectedItemId,
        nameSpanish: expectedItemId,
        category: "item"
      }
    );
  }

  async function getDialogItemsForTask(task) {
    const expectedItem = getExpectedTaskItem(task);

    if (!activeLevel || !expectedItem) {
      return [];
    }

    const cacheKey = `${activeLevel.levelId}:${task.taskId}:${expectedItem.id}`;

    if (state.itemChoiceCache.has(cacheKey)) {
      return state.itemChoiceCache.get(cacheKey);
    }

    try {
      const response = await aiClient.generateItemChoices(buildQuestContext(task), expectedItem, activeLevel.items);
      const choices = Array.isArray(response.choices) ? response.choices : [expectedItem];
      state.itemChoiceCache.set(cacheKey, choices);

      return choices;
    } catch (error) {
      console.error(error);
      return [expectedItem];
    }
  }

  function clearDialogItems() {
    state.selectedDialogItemId = null;
    dialogItemOptions.innerHTML = "";
    dialogItemSection.hidden = true;
  }

  function selectDialogItem(itemId) {
    state.selectedDialogItemId = itemId;

    Array.from(dialogItemOptions.children).forEach((button) => {
      const isSelected = button.dataset.itemId === itemId;
      button.classList.toggle("dialog-item-card--selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function getItemPlaceholderImage(item) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="10" fill="#f6f8fb"/><rect x="18" y="18" width="60" height="60" rx="8" fill="#f5b942" stroke="#1d2433" stroke-width="4"/><rect x="30" y="32" width="36" height="24" rx="5" fill="#fff4bf" stroke="#1d2433" stroke-width="3"/><rect x="34" y="64" width="28" height="8" rx="2" fill="#1d2433" opacity="0.35"/></svg>';

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  async function loadDialogItemImage(item, task, imageElement) {
    const cacheKey = `${activeLevel.levelId}:${item.id}:${item.nameSpanish}`;

    if (state.itemImageCache.has(cacheKey)) {
      imageElement.src = state.itemImageCache.get(cacheKey);
      return;
    }

    try {
      const image = await aiClient.generateItemImage(item, buildQuestContext(task));
      if (image.imageDataUrl) {
        state.itemImageCache.set(cacheKey, image.imageDataUrl);
        imageElement.src = image.imageDataUrl;
      }
    } catch (error) {
      imageElement.alt = `${item.nameGerman} konnte nicht geladen werden.`;
      console.error(error);
    }
  }

  async function renderDialogItems(task) {
    const expectedItem = getExpectedTaskItem(task);
    clearDialogItems();

    if (!expectedItem) {
      return;
    }

    dialogItemSection.hidden = false;
    dialogItemOptions.textContent = "Items werden vorbereitet...";

    const items = await getDialogItemsForTask(task);

    if (!state.dialogOpen || getActiveTask()?.taskId !== task.taskId) {
      return;
    }

    dialogItemOptions.innerHTML = "";

    if (items.length === 0) {
      dialogItemSection.hidden = true;
      return;
    }

    items.forEach((item) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "dialog-item-card";
      optionButton.dataset.itemId = item.id;
      optionButton.setAttribute("aria-pressed", "false");

      const imageWrap = document.createElement("span");
      imageWrap.className = "dialog-item-card__image-wrap";

      const image = document.createElement("img");
      image.className = "dialog-item-card__image";
      image.alt = item.nameSpanish;
      image.src = getItemPlaceholderImage(item);
      imageWrap.appendChild(image);

      const spanishName = document.createElement("strong");
      spanishName.className = "dialog-item-card__name";
      spanishName.textContent = item.nameSpanish;

      optionButton.appendChild(imageWrap);
      optionButton.appendChild(spanishName);
      optionButton.addEventListener("click", () => selectDialogItem(item.id));
      dialogItemOptions.appendChild(optionButton);

      loadDialogItemImage(item, task, image);
    });
  }

  function isWordOrderTask(task) {
    return task?.taskType === "word_order" && task.wordOrder;
  }

  function clearWordOrderTask() {
    state.wordOrderTaskId = null;
    state.wordOrderTiles = [];
    state.wordOrderAnswerIds = [];
    state.wordOrderBankIds = [];
    wordOrderAnswer.innerHTML = "";
    wordOrderBank.innerHTML = "";
  }

  function initializeWordOrderTask(task) {
    clearWordOrderTask();
    state.wordOrderTaskId = task.taskId;
    state.wordOrderTiles = task.wordOrder.tiles.map((text, index) => ({
      id: `${task.taskId}:word:${index}`,
      text
    }));
    state.wordOrderBankIds = state.wordOrderTiles.map((tile) => tile.id);
    renderWordOrderState();
  }

  function getWordOrderTile(tileId) {
    return state.wordOrderTiles.find((tile) => tile.id === tileId) || null;
  }

  function moveWordOrderTile(tileId, targetZone, beforeTileId = null) {
    if (!getWordOrderTile(tileId) || beforeTileId === tileId) {
      return;
    }

    state.wordOrderAnswerIds = state.wordOrderAnswerIds.filter((id) => id !== tileId);
    state.wordOrderBankIds = state.wordOrderBankIds.filter((id) => id !== tileId);

    const targetIds = targetZone === "answer" ? state.wordOrderAnswerIds : state.wordOrderBankIds;
    const insertionIndex = beforeTileId ? targetIds.indexOf(beforeTileId) : -1;

    if (insertionIndex >= 0) {
      targetIds.splice(insertionIndex, 0, tileId);
    } else {
      targetIds.push(tileId);
    }

    renderWordOrderState();
  }

  function createWordOrderTile(tileId, zone) {
    const tile = getWordOrderTile(tileId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `word-order__tile word-order__tile--${zone}`;
    button.dataset.wordTileId = tileId;
    button.draggable = true;
    button.textContent = tile?.text || "";
    button.setAttribute(
      "aria-label",
      zone === "bank" ? `${tile?.text}: zum Satz hinzufügen` : `${tile?.text}: zurück in die Wortbank`
    );

    button.addEventListener("click", () => {
      moveWordOrderTile(tileId, zone === "bank" ? "answer" : "bank");
    });
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", tileId);
      button.classList.add("word-order__tile--dragging");
    });
    button.addEventListener("dragend", () => {
      button.classList.remove("word-order__tile--dragging");
      wordOrderAnswer.classList.remove("word-order__zone--dragover");
      wordOrderBank.classList.remove("word-order__zone--dragover");
    });

    return button;
  }

  function renderWordOrderZone(container, tileIds, zone) {
    container.innerHTML = "";

    if (tileIds.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "word-order__placeholder";
      placeholder.textContent = zone === "answer" ? "Ziehe Wörter hierher." : "Alle Wörter wurden verwendet.";
      container.appendChild(placeholder);
      return;
    }

    tileIds.forEach((tileId) => container.appendChild(createWordOrderTile(tileId, zone)));
  }

  function renderWordOrderState() {
    renderWordOrderZone(wordOrderAnswer, state.wordOrderAnswerIds, "answer");
    renderWordOrderZone(wordOrderBank, state.wordOrderBankIds, "bank");
  }

  function isSentenceGapTask(task) {
    return task?.taskType === "sentence_gap" && task.sentenceGap;
  }

  function clearSentenceGapTask() {
    state.sentenceGapTaskId = null;
    state.sentenceGapTiles = [];
    state.sentenceGapSlotIds = [];
    state.sentenceGapBankIds = [];
    sentenceGapSentence.innerHTML = "";
    sentenceGapBank.innerHTML = "";
    sentenceGapBankWrap.hidden = true;
  }

  function getSentenceGapTile(tileId) {
    return state.sentenceGapTiles.find((tile) => tile.id === tileId) || null;
  }

  function initializeSentenceGapTask(task) {
    clearSentenceGapTask();
    state.sentenceGapTaskId = task.taskId;
    const gapCount = (task.sentenceGap.template.match(/___/g) || []).length;
    state.sentenceGapSlotIds = Array.from({ length: gapCount }, () => null);

    if (task.sentenceGap.inputMode === "drag_drop") {
      state.sentenceGapTiles = task.sentenceGap.wordBank.map((text, index) => ({
        id: `${task.taskId}:gap:${index}`,
        text
      }));
      state.sentenceGapBankIds = state.sentenceGapTiles.map((tile) => tile.id);
    }

    renderSentenceGapState(task);
  }

  function moveSentenceGapTile(tileId, targetSlotIndex = null) {
    if (!getSentenceGapTile(tileId)) {
      return;
    }

    state.sentenceGapSlotIds = state.sentenceGapSlotIds.map((id) => id === tileId ? null : id);
    state.sentenceGapBankIds = state.sentenceGapBankIds.filter((id) => id !== tileId);

    if (Number.isInteger(targetSlotIndex) && targetSlotIndex >= 0) {
      const displacedTileId = state.sentenceGapSlotIds[targetSlotIndex];

      if (displacedTileId && displacedTileId !== tileId) {
        state.sentenceGapBankIds.push(displacedTileId);
      }

      state.sentenceGapSlotIds[targetSlotIndex] = tileId;
    } else if (!state.sentenceGapBankIds.includes(tileId)) {
      state.sentenceGapBankIds.push(tileId);
    }

    renderSentenceGapState(getActiveTask());
  }

  function createSentenceGapTile(tileId, zone) {
    const tile = getSentenceGapTile(tileId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `word-order__tile word-order__tile--${zone === "bank" ? "bank" : "answer"} sentence-gap__tile`;
    button.dataset.sentenceGapTileId = tileId;
    button.draggable = true;
    button.textContent = tile?.text || "";
    button.setAttribute(
      "aria-label",
      zone === "bank" ? `${tile?.text}: in die nächste Lücke einsetzen` : `${tile?.text}: zurück in die Wortbank`
    );

    button.addEventListener("click", () => {
      if (zone === "bank") {
        const firstEmptySlot = state.sentenceGapSlotIds.findIndex((id) => id === null);

        if (firstEmptySlot >= 0) {
          moveSentenceGapTile(tileId, firstEmptySlot);
        }
      } else {
        moveSentenceGapTile(tileId);
      }
    });
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", tileId);
      button.classList.add("word-order__tile--dragging");
    });
    button.addEventListener("dragend", () => {
      button.classList.remove("word-order__tile--dragging");
      sentenceGapBank.classList.remove("sentence-gap__bank--dragover");
      sentenceGapSentence.querySelectorAll(".sentence-gap__slot--dragover").forEach((slot) => {
        slot.classList.remove("sentence-gap__slot--dragover");
      });
    });

    return button;
  }

  function renderSentenceGapState(task) {
    if (!isSentenceGapTask(task) || state.sentenceGapTaskId !== task.taskId) {
      return;
    }

    const usesDragDrop = task.sentenceGap.inputMode === "drag_drop";
    const templateParts = task.sentenceGap.template.split("___");
    sentenceGapSentence.innerHTML = "";

    templateParts.forEach((part, index) => {
      if (part) {
        const fragment = document.createElement("span");
        fragment.className = "sentence-gap__fragment";
        fragment.textContent = part;
        sentenceGapSentence.appendChild(fragment);
      }

      if (index >= templateParts.length - 1) {
        return;
      }

      if (!usesDragDrop) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "sentence-gap__input";
        input.dataset.sentenceGapInput = String(index);
        input.placeholder = `Lücke ${index + 1}`;
        input.autocomplete = "off";
        input.setAttribute("aria-label", `Fehlendes spanisches Wort ${index + 1}`);
        sentenceGapSentence.appendChild(input);
        return;
      }

      const slot = document.createElement("div");
      const tileId = state.sentenceGapSlotIds[index];
      slot.className = "sentence-gap__slot";
      slot.dataset.sentenceGapSlot = String(index);
      slot.setAttribute("aria-label", `Lücke ${index + 1}`);
      slot.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        slot.classList.add("sentence-gap__slot--dragover");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("sentence-gap__slot--dragover"));
      slot.addEventListener("drop", (event) => {
        event.preventDefault();
        slot.classList.remove("sentence-gap__slot--dragover");
        moveSentenceGapTile(event.dataTransfer.getData("text/plain"), index);
      });

      if (tileId) {
        slot.appendChild(createSentenceGapTile(tileId, "slot"));
      } else {
        slot.textContent = `Lücke ${index + 1}`;
      }

      sentenceGapSentence.appendChild(slot);
    });

    sentenceGapBankWrap.hidden = !usesDragDrop;
    sentenceGapBank.innerHTML = "";

    if (!usesDragDrop) {
      return;
    }

    if (state.sentenceGapBankIds.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "word-order__placeholder";
      placeholder.textContent = "Alle Wörter wurden eingesetzt.";
      sentenceGapBank.appendChild(placeholder);
      return;
    }

    state.sentenceGapBankIds.forEach((tileId) => {
      sentenceGapBank.appendChild(createSentenceGapTile(tileId, "bank"));
    });
  }

  function getSentenceGapValues(task) {
    if (!isSentenceGapTask(task)) {
      return [];
    }

    if (task.sentenceGap.inputMode === "drag_drop") {
      return state.sentenceGapSlotIds.map((tileId) => getSentenceGapTile(tileId)?.text || "");
    }

    return Array.from(sentenceGapSentence.querySelectorAll("[data-sentence-gap-input]"))
      .map((input) => input.value.trim());
  }

  function buildSentenceGapAnswer(task) {
    const values = getSentenceGapValues(task);
    let valueIndex = 0;

    return task.sentenceGap.template
      .replace(/___/g, () => values[valueIndex++] || "")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/([¿¡])\s+/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function renderTaskAnswerMode(task) {
    const usesWordOrder = isWordOrderTask(task);
    const usesSentenceGap = isSentenceGapTask(task);
    freeTextAnswer.hidden = usesWordOrder || usesSentenceGap;
    wordOrderSection.hidden = !usesWordOrder;
    sentenceGapSection.hidden = !usesSentenceGap;

    if (usesWordOrder) {
      clearSentenceGapTask();
      initializeWordOrderTask(task);
      return;
    }

    clearWordOrderTask();

    if (usesSentenceGap) {
      initializeSentenceGapTask(task);
      return;
    }

    clearSentenceGapTask();
  }

  function getCurrentTaskAnswer(task) {
    if (isWordOrderTask(task)) {
      return state.wordOrderAnswerIds
        .map((tileId) => getWordOrderTile(tileId)?.text || "")
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    if (isSentenceGapTask(task)) {
      return buildSentenceGapAnswer(task);
    }

    return answerInput.value.trim();
  }

  function focusCurrentAnswerControl(task) {
    if (isWordOrderTask(task)) {
      const firstTile = wordOrderBank.querySelector(".word-order__tile") || wordOrderAnswer.querySelector(".word-order__tile");
      (firstTile || resetWordOrderButton).focus();
      return;
    }

    if (isSentenceGapTask(task)) {
      const firstControl = sentenceGapSentence.querySelector(".sentence-gap__input")
        || sentenceGapBank.querySelector(".sentence-gap__tile")
        || sentenceGapSentence.querySelector(".sentence-gap__tile");
      (firstControl || resetSentenceGapButton).focus();
      return;
    }

    answerInput.focus();
  }

  function handleWordOrderDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    event.currentTarget.classList.add("word-order__zone--dragover");
  }

  function handleWordOrderDrop(event) {
    event.preventDefault();
    const targetZone = event.currentTarget.dataset.wordZone;
    const tileId = event.dataTransfer.getData("text/plain");
    const beforeTileId = event.target.closest(".word-order__tile")?.dataset.wordTileId || null;
    event.currentTarget.classList.remove("word-order__zone--dragover");
    moveWordOrderTile(tileId, targetZone, beforeTileId);
  }

  function clearHint() {
    hintContent.innerHTML = "";
  }

  function renderHint(hint) {
    hintContent.innerHTML = "";

    const hintBox = document.createElement("div");
    hintBox.className = "hint-content__box";

    const hintText = document.createElement("p");
    hintText.className = "hint-content__text";
    hintText.textContent = hint.hintGerman;
    hintBox.appendChild(hintText);

    if (hint.sentenceStarter) {
      const starter = document.createElement("p");
      starter.className = "hint-content__starter";
      starter.textContent = `Satzanfang: ${hint.sentenceStarter}`;
      hintBox.appendChild(starter);
    }

    if (Array.isArray(hint.vocabulary) && hint.vocabulary.length > 0) {
      const vocabList = document.createElement("ul");
      vocabList.className = "hint-content__vocab";

      hint.vocabulary.forEach((entry) => {
        const vocabItem = document.createElement("li");
        vocabItem.textContent = `${entry.de} = ${entry.es}`;
        vocabList.appendChild(vocabItem);
      });

      hintBox.appendChild(vocabList);
    }

    hintContent.appendChild(hintBox);
  }

  function renderDialogPortrait(task) {
    const asset = getCharacterAssetForTask(task);

    if (!asset?.portrait) {
      dialogPanel.classList.remove("dialog--with-portrait");
      dialogPortraitCard.hidden = true;
      dialogPortrait.removeAttribute("src");
      dialogPortrait.alt = "";
      dialogPortraitCaption.textContent = "";
      return;
    }

    dialogPanel.classList.add("dialog--with-portrait");
    dialogPortraitCard.hidden = false;
    dialogPortrait.src = asset.portrait;
    dialogPortrait.alt = `Portrait von ${task.npcName || asset.name}`;
    dialogPortraitCaption.textContent = task.npcName || asset.name;
  }

  function openDialog(target) {
    const task = target.task;
    state.dialogOpen = true;
    state.activeDialogTarget = target;
    state.hintLevel = 1;
    state.lastUserAnswer = null;
    dialogTitle.textContent = task.titleGerman || task.instructionGerman || "Aktuelle Aufgabe";
    if (dialogSpeakerName) {
      dialogSpeakerName.textContent = task.npcName;
    }
    dialogLine.textContent = task.npcSpanish;
    renderDialogPortrait(task);
    renderDialogItems(task);
    answerInput.value = "";
    renderTaskAnswerMode(task);
    dialogOverlay.hidden = false;
    feedbackMessage.textContent = task.instructionGerman;
    feedbackMessage.className = "feedback";
    clearHint();
    updateInteractionPrompt();
    focusCurrentAnswerControl(task);
  }

  function closeDialog() {
    state.dialogOpen = false;
    state.activeDialogTarget = null;
    dialogOverlay.hidden = true;
    clearDialogItems();
    clearWordOrderTask();
    clearSentenceGapTask();
    clearHint();
    updateInteractionPrompt();
  }

  function renderEvaluationFeedback(evaluation) {
    feedbackMessage.textContent = evaluation.feedbackGerman;
    feedbackMessage.className = evaluation.isCorrect
      ? "feedback feedback--success"
      : "feedback feedback--error";

    if (evaluation.nextAction === "show_hint") {
      const hintText = evaluation.hintGerman ? ` Hinweis: ${evaluation.hintGerman}` : "";
      feedbackMessage.textContent = `${evaluation.feedbackGerman}${hintText} Vorschlag: ${evaluation.correctedSpanish}`;
    }
  }

  function completeTask(task) {
    addXp(task.rewardXp, `${activeLevel.levelId}:${task.taskId}:correct`);
    addInventoryItem(task.rewardItem);
    removeInventoryItem(task.removeItemOnSuccess);
    feedbackMessage.textContent = task.successMessageGerman;
    feedbackMessage.className = "feedback feedback--success";

    activeTaskIndex += 1;

    if (activeTaskIndex >= activeLevel.tasks.length) {
      completeLevel();
      return;
    }

    closeDialog();
    renderLevelScene();
    updateHud();
    updateInteractionPrompt();
  }

  function getNextCatalogLevel() {
    return currentCatalogLevel ? getCatalogLevelByNumber(currentCatalogLevel.number + 1) : null;
  }

  function recordLevelCompletion() {
    if (!currentCatalogLevel) {
      return;
    }

    if (!progress.completedLevelIds.includes(currentCatalogLevel.id)) {
      progress.completedLevelIds.push(currentCatalogLevel.id);
    }

    const nextLevel = getNextCatalogLevel();

    if (nextLevel) {
      progress.unlockedLevel = Math.max(progress.unlockedLevel, nextLevel.number);
    }

    saveProgress();
  }

  function completeLevel() {
    state.levelStatus = "completed";
    state.gameStarted = false;
    state.dialogOpen = false;
    state.activeDialogTarget = null;
    recordLevelCompletion();
    hideGameScreens();
    levelCompleteScreen.hidden = false;
    levelCompleteTitle.textContent = currentCatalogLevel
      ? `Level ${currentCatalogLevel.number} abgeschlossen`
      : "Level abgeschlossen";
    levelSummary.textContent = activeLevel.summaryGerman;
    renderVocabularyList(learnedVocabularyList, activeLevel.vocabularyPreview);
    const nextLevel = getNextCatalogLevel();
    nextLevelButton.disabled = !nextLevel;
    nextLevelButton.textContent = nextLevel ? "N\u00e4chstes Level" : "Alle Level abgeschlossen";
    updateHud();
    playLevelCompleteSound();
  }

  function startNextCatalogLevel() {
    const nextLevel = getNextCatalogLevel();

    if (!nextLevel) {
      showLevelSelection(currentCatalogLevel?.number || progress.unlockedLevel);
      return;
    }

    loadGeneratedLevel(nextLevel);
  }

  async function handleSubmitAnswer() {
    const task = getActiveTask();
    const userAnswer = getCurrentTaskAnswer(task);
    state.lastUserAnswer = userAnswer;

    if (!task || state.levelStatus === "completed") {
      feedbackMessage.textContent = "Level abgeschlossen.";
      feedbackMessage.className = "feedback feedback--success";
      return;
    }

    if (task.requiredItem && !hasInventoryItem(task.requiredItem)) {
      feedbackMessage.textContent = "Du brauchst zuerst das passende Item für diese Aufgabe.";
      feedbackMessage.className = "feedback feedback--error";
      return;
    }

    const expectedItemId = getExpectedTaskItemId(task);

    if (expectedItemId && !state.selectedDialogItemId) {
      feedbackMessage.textContent = "Wähle zuerst den passenden Gegenstand aus.";
      feedbackMessage.className = "feedback feedback--error";
      return;
    }

    if (expectedItemId && state.selectedDialogItemId !== expectedItemId) {
      feedbackMessage.textContent = "Das ist noch nicht der passende Gegenstand für diese Aufgabe.";
      feedbackMessage.className = "feedback feedback--error";
      return;
    }

    if (isWordOrderTask(task) && state.wordOrderAnswerIds.length !== state.wordOrderTiles.length) {
      feedbackMessage.textContent = "Nutze zuerst alle Wörter aus der Wortbank.";
      feedbackMessage.className = "feedback feedback--error";
      return;
    }

    if (isSentenceGapTask(task) && getSentenceGapValues(task).some((value) => !value)) {
      feedbackMessage.textContent = "Fülle zuerst alle Lücken aus.";
      feedbackMessage.className = "feedback feedback--error";
      return;
    }

    if (!userAnswer.trim()) {
      feedbackMessage.textContent = isWordOrderTask(task)
        ? "Ordne zuerst die Wörter zu einem Satz."
        : isSentenceGapTask(task)
          ? "Fülle zuerst den Lückentext aus."
          : "Schreib eine kurze Antwort auf Spanisch.";
      feedbackMessage.className = "feedback feedback--error";
      return;
    }

    submitButton.disabled = true;
    feedbackMessage.textContent = "Antwort wird bewertet...";
    feedbackMessage.className = "feedback";
    clearHint();

    try {
      const evaluation = await aiClient.evaluateAnswer(userAnswer, buildQuestContext(task));
      renderEvaluationFeedback(evaluation);

      if (evaluation.isCorrect) {
        completeTask(task);
      }
    } catch (error) {
      feedbackMessage.textContent = "Die Bewertung ist gerade nicht erreichbar. Bitte versuche es erneut.";
      feedbackMessage.className = "feedback feedback--error";
      console.error(error);
    } finally {
      submitButton.disabled = false;
      focusCurrentAnswerControl(task);
    }
  }

  async function handleHelpRequest() {
    const task = getActiveTask();

    if (!task || state.levelStatus === "completed") {
      feedbackMessage.textContent = "Level abgeschlossen.";
      feedbackMessage.className = "feedback feedback--success";
      clearHint();
      return;
    }

    if (!state.activeDialogTarget) {
      feedbackMessage.textContent = "Öffne zuerst den Dialog am aktuellen Questziel.";
      feedbackMessage.className = "feedback feedback--error";
      clearHint();
      return;
    }

    const lastUserAnswer = getCurrentTaskAnswer(task) || state.lastUserAnswer;

    helpButton.disabled = true;
    feedbackMessage.textContent = "Hilfe wird vorbereitet...";
    feedbackMessage.className = "feedback";
    clearHint();

    try {
      const hint = await aiClient.generateHint(buildQuestContext(task), lastUserAnswer, state.hintLevel);
      renderHint(hint);
      feedbackMessage.textContent = "";
      feedbackMessage.className = "feedback";
      state.hintLevel += 1;
    } catch (error) {
      feedbackMessage.textContent = "Die Hilfestellung ist gerade nicht erreichbar. Bitte versuche es erneut.";
      feedbackMessage.className = "feedback feedback--error";
      console.error(error);
    } finally {
      helpButton.disabled = false;
      focusCurrentAnswerControl(task);
    }
  }

  function showRandomSidequest() {
    const availableSidequests = SIDEQUESTS.filter((sidequest) => !state.completedSidequests.has(sidequest.id));
    const sidequestPool = availableSidequests.length > 0 ? availableSidequests : SIDEQUESTS;
    const randomIndex = Math.floor(Math.random() * sidequestPool.length);

    renderSidequest(sidequestPool[randomIndex]);
  }

  function renderSidequest(sidequest) {
    state.activeSidequest = sidequest;
    state.sidequestOpen = true;
    sidequestTitle.textContent = sidequest.title;
    sidequestQuestion.textContent = sidequest.question;
    sidequestFeedback.textContent = state.completedSidequests.has(sidequest.id)
      ? "Diese Mini-Challenge wurde schon gelöst. Du kannst sie wiederholen, aber erhältst keine weiteren XP."
      : "";
    sidequestFeedback.className = "feedback";
    sidequestOptions.innerHTML = "";

    sidequest.options.forEach((option) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.textContent = option;
      optionButton.addEventListener("click", () => handleSidequestAnswer(option));
      sidequestOptions.appendChild(optionButton);
    });

    sidequestOverlay.hidden = false;
    updateInteractionPrompt();
  }

  function handleSidequestAnswer(selectedAnswer) {
    const sidequest = state.activeSidequest;

    if (!sidequest) {
      return;
    }

    if (selectedAnswer === sidequest.correctAnswer) {
      const xpAdded = addXp(5, `sidequest:${sidequest.id}`);
      state.completedSidequests.add(sidequest.id);
      sidequestFeedback.textContent = xpAdded
        ? `Richtig! ${sidequest.explanationGerman} +5 XP`
        : `Richtig! ${sidequest.explanationGerman} Diese Mini-Challenge gibt keine weiteren XP.`;
      sidequestFeedback.className = "feedback feedback--success";

      Array.from(sidequestOptions.children).forEach((button) => {
        button.disabled = true;
      });
      return;
    }

    sidequestFeedback.textContent = `Noch nicht. ${sidequest.explanationGerman}`;
    sidequestFeedback.className = "feedback feedback--error";
  }

  function closeSidequest() {
    state.sidequestOpen = false;
    state.activeSidequest = null;
    sidequestOverlay.hidden = true;
    updateInteractionPrompt();
  }

  function gameLoop() {
    if (
      state.gameStarted
      && state.levelStatus === "active"
      && !state.dialogOpen
      && !state.sidequestOpen
      && !state.vocabularyOpen
      && !state.settingsOpen
    ) {
      if (state.keys.has("arrowleft") || state.keys.has("a")) {
        state.playerX -= state.speed;
      }

      if (state.keys.has("arrowright") || state.keys.has("d")) {
        state.playerX += state.speed;
      }

      updatePlayerPosition();
      updateInteractionPrompt();
    }

    requestAnimationFrame(gameLoop);
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    state.keys.add(key);

    if (key === "escape" && state.characterSelectOpen) {
      event.preventDefault();
      closeCharacterSelection();
      return;
    }

    if (key === "escape" && state.settingsOpen) {
      event.preventDefault();
      closeSettings();
      return;
    }

    if (
      key === "m"
      && state.gameStarted
      && !state.dialogOpen
      && !state.sidequestOpen
      && !state.vocabularyOpen
      && !state.settingsOpen
      && event.target !== answerInput
    ) {
      showRandomSidequest();
    }

    if (
      key === "e"
      && state.gameStarted
      && !state.dialogOpen
      && !state.sidequestOpen
      && !state.vocabularyOpen
      && !state.settingsOpen
    ) {
      const target = getCurrentInteractionTarget();

      if (target) {
        event.preventDefault();
        openDialog(target);
      }
    }

    if (key === "escape" && state.vocabularyOpen) {
      closeVocabularyJournal();
      return;
    }

    if (key === "escape" && state.sidequestOpen) {
      closeSidequest();
      return;
    }

    if (key === "escape" && state.dialogOpen) {
      closeDialog();
    }
  });

  window.addEventListener("keyup", (event) => {
    state.keys.delete(event.key.toLowerCase());
  });

  window.addEventListener("resize", () => {
    updateWorldMetrics();
    if (activeLevel && state.levelStatus === "active") {
      renderLevelScene();
    }
    updatePlayerPosition();
    updateInteractionPrompt();
  });

  playButton.addEventListener("click", startNewGame);
  continueButton.addEventListener("click", () => showLevelSelection(progress.unlockedLevel));
  characterSelectButton.addEventListener("click", openCharacterSelection);
  characterOptionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      pendingPlayerCharacterId = getPlayerCharacter(button.dataset.characterId).id;
      renderCharacterSelection();
    });
  });
  confirmCharacterSelectButton.addEventListener("click", confirmCharacterSelection);
  cancelCharacterSelectButton.addEventListener("click", closeCharacterSelection);
  closeCharacterSelectXButton.addEventListener("click", closeCharacterSelection);
  settingsButtons.forEach((button) => {
    button.addEventListener("click", () => openSettings(button));
  });
  closeSettingsButton.addEventListener("click", closeSettings);
  closeSettingsXButton.addEventListener("click", closeSettings);
  audioVolumeInputs.forEach((input) => {
    input.addEventListener("input", () => handleAudioVolumeInput(input));
  });
  audioElements.levelComplete.addEventListener("ended", finishLevelCompleteSound);
  audioElements.levelComplete.addEventListener("error", finishLevelCompleteSound);
  document.addEventListener("click", handleDocumentAudioClick);
  levelSelectBackButton.addEventListener("click", showMainMenu);
  levelSelectStartButton.addEventListener("click", () => loadGeneratedLevel(selectedCatalogLevel));
  startLevelButton.addEventListener("click", () => {
    if (state.levelLoadFailed) {
      loadGeneratedLevel(currentCatalogLevel);
      return;
    }

    startLevel();
  });
  nextLevelButton.addEventListener("click", startNextCatalogLevel);
  completeLevelSelectButton.addEventListener("click", () => {
    const preferredLevel = getNextCatalogLevel() || currentCatalogLevel;
    showLevelSelection(preferredLevel?.number || progress.unlockedLevel);
  });
  completeMainMenuButton.addEventListener("click", showMainMenu);
  submitButton.addEventListener("click", handleSubmitAnswer);
  helpButton.addEventListener("click", handleHelpRequest);
  closeDialogButton.addEventListener("click", closeDialog);
  closeDialogXButton.addEventListener("click", closeDialog);
  newEnvironmentButton.addEventListener("click", startNextCatalogLevel);
  newQuestButton.addEventListener("click", () => loadGeneratedLevel(currentCatalogLevel));
  vocabularyButton.addEventListener("click", openVocabularyJournal);
  closeVocabularyButton.addEventListener("click", closeVocabularyJournal);
  closeVocabularyXButton.addEventListener("click", closeVocabularyJournal);
  sidequestButton.addEventListener("click", showRandomSidequest);
  closeSidequestButton.addEventListener("click", closeSidequest);
  closeSidequestXButton.addEventListener("click", closeSidequest);
  [wordOrderAnswer, wordOrderBank].forEach((zone) => {
    zone.addEventListener("dragover", handleWordOrderDragOver);
    zone.addEventListener("dragleave", () => zone.classList.remove("word-order__zone--dragover"));
    zone.addEventListener("drop", handleWordOrderDrop);
  });
  resetWordOrderButton.addEventListener("click", () => {
    const task = getActiveTask();

    if (isWordOrderTask(task)) {
      initializeWordOrderTask(task);
      focusCurrentAnswerControl(task);
    }
  });
  sentenceGapBank.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    sentenceGapBank.classList.add("sentence-gap__bank--dragover");
  });
  sentenceGapBank.addEventListener("dragleave", () => {
    sentenceGapBank.classList.remove("sentence-gap__bank--dragover");
  });
  sentenceGapBank.addEventListener("drop", (event) => {
    event.preventDefault();
    sentenceGapBank.classList.remove("sentence-gap__bank--dragover");
    moveSentenceGapTile(event.dataTransfer.getData("text/plain"));
  });
  resetSentenceGapButton.addEventListener("click", () => {
    const task = getActiveTask();

    if (isSentenceGapTask(task)) {
      initializeSentenceGapTask(task);
      focusCurrentAnswerControl(task);
    }
  });
  sentenceGapSentence.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches(".sentence-gap__input")) {
      handleSubmitAnswer();
    }
  });

  answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !isWordOrderTask(getActiveTask())) {
      handleSubmitAnswer();
    }
  });

  audioSettings = loadAudioSettings();
  applyAudioSettings();
  loadProgress();
  applyPlayerCharacter(loadPlayerCharacterPreference());
  renderInventory();
  showMainMenu();
  gameLoop();
})();
