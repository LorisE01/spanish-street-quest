(function () {
  const appShell = document.getElementById("app-shell");
  const mainMenu = document.getElementById("main-menu");
  const vocabularyScreen = document.getElementById("vocabulary-screen");
  const levelCompleteScreen = document.getElementById("level-complete-screen");
  const playButton = document.getElementById("play-button");
  const startLevelButton = document.getElementById("start-level-button");
  const nextLevelButton = document.getElementById("next-level-button");
  const vocabularyTitle = document.getElementById("vocabulary-title");
  const vocabularyDescription = document.getElementById("vocabulary-description");
  const vocabularyList = document.getElementById("vocabulary-list");
  const learnedVocabularyList = document.getElementById("learned-vocabulary-list");
  const levelSummary = document.getElementById("level-summary");
  const player = document.getElementById("player");
  const sceneLayer = document.getElementById("scene-layer");
  const prompt = document.getElementById("interaction-prompt");
  const dialogOverlay = document.getElementById("dialog-overlay");
  const dialogPanel = dialogOverlay.querySelector(".dialog");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogPortraitCard = document.getElementById("dialog-portrait-card");
  const dialogPortrait = document.getElementById("dialog-portrait");
  const dialogPortraitCaption = document.getElementById("dialog-portrait-caption");
  const dialogLine = document.getElementById("vendor-line");
  const dialogItemSection = document.getElementById("dialog-item-section");
  const dialogItemOptions = document.getElementById("dialog-item-options");
  const answerInput = document.getElementById("answer-input");
  const feedbackMessage = document.getElementById("feedback-message");
  const hintContent = document.getElementById("hint-content");
  const submitButton = document.getElementById("submit-answer");
  const helpButton = document.getElementById("help-button");
  const closeDialogButton = document.getElementById("close-dialog");
  const closeDialogXButton = document.getElementById("close-dialog-x");
  const xpValue = document.getElementById("xp-value");
  const environmentTitle = document.getElementById("environment-title");
  const questTitle = document.getElementById("quest-title");
  const inventoryList = document.getElementById("inventory-list");
  const world = document.getElementById("world");
  const newEnvironmentButton = document.getElementById("new-environment-button");
  const newQuestButton = document.getElementById("new-quest-button");
  const sidequestButton = document.getElementById("sidequest-button");
  const sidequestOverlay = document.getElementById("sidequest-overlay");
  const sidequestTitle = document.getElementById("sidequest-title");
  const sidequestQuestion = document.getElementById("sidequest-question");
  const sidequestOptions = document.getElementById("sidequest-options");
  const sidequestFeedback = document.getElementById("sidequest-feedback");
  const closeSidequestButton = document.getElementById("close-sidequest");
  const closeSidequestXButton = document.getElementById("close-sidequest-x");

  let activeLevel = null;
  let activeTaskIndex = 0;

  const characterAssets = {
    cashier: {
      name: "Kassierer",
      portrait: "/assets/characters/cashier.png",
      sprite: "/assets/characters/cashier_idle.png"
    },
    carlos: {
      name: "Carlos",
      portrait: "/assets/characters/carlos.png",
      sprite: "/assets/characters/carlos_idle.png"
    }
  };

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
    activeDialogTarget: null,
    activeSidequest: null,
    lastUserAnswer: null,
    hintLevel: 1,
    selectedDialogItemId: null,
    itemImageCache: new Map(),
    itemChoiceCache: new Map(),
    levelStatus: "idle",
    xpAwardKeys: new Set(),
    completedSidequests: new Set()
  };

  function getActiveTask() {
    return activeLevel ? activeLevel.tasks[activeTaskIndex] : null;
  }

  function getCharacterKeyForTask(task) {
    if (!task) {
      return "cashier";
    }

    const text = [
      task.npcId,
      task.npcName,
      task.expectedIntent,
      task.instructionGerman,
      task.titleGerman
    ]
      .join(" ")
      .toLowerCase();
    const isDeliveryTask =
      Boolean(task.requiredItem || task.removeItemOnSuccess) ||
      text.includes("carlos") ||
      text.includes("give_item") ||
      text.includes("bring") ||
      text.includes("bringst") ||
      text.includes("bringe") ||
      text.includes("geben") ||
      text.includes("gib") ||
      text.includes("entregar") ||
      text.includes("tengo");

    return isDeliveryTask ? "carlos" : "cashier";
  }

  function getCharacterAssetForTask(task) {
    return characterAssets[getCharacterKeyForTask(task)];
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

  function showVocabularyScreen(level) {
    appShell.hidden = true;
    levelCompleteScreen.hidden = true;
    vocabularyScreen.hidden = false;
    startLevelButton.hidden = false;
    vocabularyTitle.textContent = level.titleGerman;
    vocabularyDescription.textContent = level.descriptionGerman;
    renderVocabularyList(vocabularyList, level.vocabularyPreview);
  }

  function updateHud() {
    environmentTitle.textContent = activeLevel?.titleGerman || "Noch nicht geladen";
    questTitle.textContent =
      state.levelStatus === "completed"
        ? "Level abgeschlossen"
        : getActiveTask()?.titleGerman || "Noch nicht geladen";
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
      const locationElement = document.createElement("div");
      locationElement.className = `dynamic-location dynamic-location--${location.type}`;
      locationElement.dataset.locationId = location.id;
      locationElement.style.left = `${worldUnitsToPixels(location.x)}px`;
      locationElement.style.width = `${location.width}px`;

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
      const activeAsset = isActiveNpc ? getCharacterAssetForTask(activeTask) : null;
      const namedAsset = npc.id === "carlos" ? characterAssets.carlos : npc.id === "cashier" ? characterAssets.cashier : null;
      const asset = activeAsset || namedAsset;
      const npcElement = document.createElement("div");
      npcElement.className = `dynamic-npc${asset?.sprite ? " dynamic-npc--sprite" : ""}${
        isActiveNpc ? " dynamic-npc--quest" : ""
      }`;
      npcElement.dataset.npcId = npc.id;
      npcElement.style.left = `${worldUnitsToPixels(npc.x)}px`;

      if (asset?.sprite) {
        npcElement.style.backgroundImage = `url("${asset.sprite}")`;
      }

      const label = document.createElement("span");
      label.className = "dynamic-npc__label";
      label.textContent = npc.nameGerman;
      npcElement.appendChild(label);
      sceneLayer.appendChild(npcElement);
    });
  }

  function removeOldQuestItemsForLevel(level) {
    const levelItemIds = new Set(level.items.map((item) => item.id));
    state.inventory = state.inventory.filter((item) => !item.questItem || levelItemIds.has(item.id));
    renderInventory();
  }

  function resetLevelState(level) {
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
    state.cameraX = 0;
    state.playerX = 120;
    dialogOverlay.hidden = true;
    newEnvironmentButton.hidden = true;
    newQuestButton.hidden = true;
    clearHint();
    removeOldQuestItemsForLevel(level);
    showVocabularyScreen(level);
  }

  async function loadGeneratedLevel() {
    playButton.disabled = true;
    nextLevelButton.disabled = true;
    newEnvironmentButton.disabled = true;
    mainMenu.hidden = true;
    appShell.hidden = true;
    levelCompleteScreen.hidden = true;
    vocabularyScreen.hidden = false;
    startLevelButton.hidden = true;
    vocabularyTitle.textContent = "Level wird geladen...";
    vocabularyDescription.textContent = "Eine Szene wird vorbereitet.";
    vocabularyList.innerHTML = "";

    try {
      const level = await aiClient.generateLevel();
      resetLevelState(level);
    } catch (error) {
      vocabularyDescription.textContent = "Das Level konnte nicht geladen werden. Bitte versuche es erneut.";
      startLevelButton.hidden = true;
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

    const activeTask = getActiveTask();
    const usesSprite = activeTask && npc.id === activeTask.npcId;
    return worldUnitsToPixels(npc.x) + (usesSprite ? 37 : 17);
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
    const locationCenter = taskLocation ? worldUnitsToPixels(taskLocation.x) + taskLocation.width / 2 : NaN;

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
    prompt.hidden = !state.gameStarted || state.dialogOpen || state.sidequestOpen || !getCurrentInteractionTarget();
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
    xpValue.textContent = `${state.xp}/100`;
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
      locationId: task.locationId,
      npcId: task.npcId,
      npcName: task.npcName,
      npcSpanish: task.npcSpanish,
      instructionGerman: task.instructionGerman,
      expectedIntent: task.expectedIntent,
      expectedExamples: task.expectedExamples,
      requiredVocabulary: task.requiredVocabulary,
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

    return task.removeItemOnSuccess || task.requiredItem || task.rewardItem || null;
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

    if (hint.exampleAnswer) {
      const example = document.createElement("p");
      example.className = "hint-content__example";
      example.textContent = `Beispiel: ${hint.exampleAnswer}`;
      hintBox.appendChild(example);
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
    dialogPortrait.alt = `Portrait von ${asset.name}`;
    dialogPortraitCaption.textContent = asset.name;
  }

  function openDialog(target) {
    const task = target.task;
    state.dialogOpen = true;
    state.activeDialogTarget = target;
    state.hintLevel = 1;
    state.lastUserAnswer = null;
    dialogTitle.textContent = task.npcName;
    dialogLine.textContent = task.npcSpanish;
    renderDialogPortrait(task);
    renderDialogItems(task);
    dialogOverlay.hidden = false;
    answerInput.value = "";
    feedbackMessage.textContent = task.instructionGerman;
    feedbackMessage.className = "feedback";
    clearHint();
    updateInteractionPrompt();
    answerInput.focus();
  }

  function closeDialog() {
    state.dialogOpen = false;
    state.activeDialogTarget = null;
    dialogOverlay.hidden = true;
    clearDialogItems();
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

  function completeLevel() {
    state.levelStatus = "completed";
    appShell.hidden = true;
    dialogOverlay.hidden = true;
    levelCompleteScreen.hidden = false;
    levelSummary.textContent = activeLevel.summaryGerman;
    renderVocabularyList(learnedVocabularyList, activeLevel.vocabularyPreview);
    updateHud();
  }

  async function handleSubmitAnswer() {
    const task = getActiveTask();
    const userAnswer = answerInput.value;
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

    if (!userAnswer.trim()) {
      feedbackMessage.textContent = "Schreib eine kurze Antwort auf Spanisch.";
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
      answerInput.focus();
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

    const lastUserAnswer = answerInput.value.trim() || state.lastUserAnswer;

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
      answerInput.focus();
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
    if (state.gameStarted && state.levelStatus === "active" && !state.dialogOpen && !state.sidequestOpen) {
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

    if (key === "m" && state.gameStarted && !state.dialogOpen && !state.sidequestOpen && event.target !== answerInput) {
      showRandomSidequest();
    }

    if (key === "e" && state.gameStarted && !state.dialogOpen && !state.sidequestOpen) {
      const target = getCurrentInteractionTarget();

      if (target) {
        event.preventDefault();
        openDialog(target);
      }
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

  playButton.addEventListener("click", () => {
    mainMenu.hidden = true;
    state.gameStarted = true;
    loadGeneratedLevel();
  });
  startLevelButton.addEventListener("click", startLevel);
  nextLevelButton.addEventListener("click", loadGeneratedLevel);
  submitButton.addEventListener("click", handleSubmitAnswer);
  helpButton.addEventListener("click", handleHelpRequest);
  closeDialogButton.addEventListener("click", closeDialog);
  closeDialogXButton.addEventListener("click", closeDialog);
  newEnvironmentButton.addEventListener("click", loadGeneratedLevel);
  newQuestButton.addEventListener("click", loadGeneratedLevel);
  sidequestButton.addEventListener("click", showRandomSidequest);
  closeSidequestButton.addEventListener("click", closeSidequest);
  closeSidequestXButton.addEventListener("click", closeSidequest);

  answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleSubmitAnswer();
    }
  });

  renderInventory();
  gameLoop();
})();
