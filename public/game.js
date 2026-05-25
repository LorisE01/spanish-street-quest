(function () {
  const player = document.getElementById("player");
  const drinkStand = document.getElementById("drink-stand");
  const carlos = document.getElementById("carlos");
  const prompt = document.getElementById("interaction-prompt");
  const dialogOverlay = document.getElementById("dialog-overlay");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogLine = document.getElementById("vendor-line");
  const answerInput = document.getElementById("answer-input");
  const feedbackMessage = document.getElementById("feedback-message");
  const hintContent = document.getElementById("hint-content");
  const submitButton = document.getElementById("submit-answer");
  const helpButton = document.getElementById("help-button");
  const closeDialogButton = document.getElementById("close-dialog");
  const closeDialogXButton = document.getElementById("close-dialog-x");
  const xpValue = document.getElementById("xp-value");
  const questTitle = document.getElementById("quest-title");
  const inventoryList = document.getElementById("inventory-list");
  const world = document.getElementById("world");
  const sidequestButton = document.getElementById("sidequest-button");
  const sidequestOverlay = document.getElementById("sidequest-overlay");
  const sidequestTitle = document.getElementById("sidequest-title");
  const sidequestQuestion = document.getElementById("sidequest-question");
  const sidequestOptions = document.getElementById("sidequest-options");
  const sidequestFeedback = document.getElementById("sidequest-feedback");
  const closeSidequestButton = document.getElementById("close-sidequest");
  const closeSidequestXButton = document.getElementById("close-sidequest-x");

  const activeQuest = QUESTS[0];
  const state = {
    playerX: 140,
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
    currentStep: "buy_lemonade",
    questStatus: "active",
    xpAwardKeys: new Set(),
    completedSidequests: new Set()
  };

  questTitle.textContent = activeQuest.steps[state.currentStep].title;

  function getCurrentStep() {
    return activeQuest.steps[state.currentStep];
  }

  function updateQuestTitle() {
    questTitle.textContent =
      state.questStatus === "completed" ? activeQuest.completedTitle : getCurrentStep().title;
  }

  function updatePlayerPosition() {
    const maxX = world.clientWidth - player.offsetWidth - 20;
    state.playerX = Math.max(20, Math.min(state.playerX, maxX));
    player.style.transform = `translateX(${state.playerX}px)`;
  }

  function isNearElement(element, distance = 110) {
    const playerBox = player.getBoundingClientRect();
    const targetBox = element.getBoundingClientRect();
    const playerCenter = playerBox.left + playerBox.width / 2;
    const targetCenter = targetBox.left + targetBox.width / 2;

    return Math.abs(playerCenter - targetCenter) < distance;
  }

  function getCurrentInteractionTarget() {
    if (state.questStatus === "completed") {
      return null;
    }

    const currentStep = getCurrentStep();
    const targetElement = currentStep.targetLocationId === "drink-stand" ? drinkStand : carlos;

    if (!isNearElement(targetElement)) {
      return null;
    }

    return {
      element: targetElement,
      step: currentStep
    };
  }

  function updateInteractionPrompt() {
    prompt.hidden = state.dialogOpen || state.sidequestOpen || !getCurrentInteractionTarget();
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
      listItem.textContent = item;
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

  function addInventoryItem(item) {
    if (!item || state.inventory.includes(item)) {
      return;
    }

    state.inventory.push(item);
    renderInventory();
  }

  function removeInventoryItem(item) {
    state.inventory = state.inventory.filter((inventoryItem) => inventoryItem !== item);
    renderInventory();
  }

  function buildQuestContext(step) {
    return {
      questId: activeQuest.id,
      currentStep: step.id,
      questStatus: state.questStatus,
      npc: step.npc,
      expectedIntent: step.expectedIntent,
      expectedExamples: step.expectedExamples,
      xpReward: step.xpReward,
      inventoryReward: step.inventoryReward || null,
      requiredItem: step.requiredItem || null
    };
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

  function openDialog(target) {
    state.dialogOpen = true;
    state.activeDialogTarget = target;
    state.hintLevel = 1;
    state.lastUserAnswer = null;
    dialogTitle.textContent = target.step.npc;
    dialogLine.textContent = target.step.prompt;
    dialogOverlay.hidden = false;
    answerInput.value = "";
    feedbackMessage.textContent = "";
    feedbackMessage.className = "feedback";
    clearHint();
    updateInteractionPrompt();
    answerInput.focus();
  }

  function closeDialog() {
    state.dialogOpen = false;
    state.activeDialogTarget = null;
    dialogOverlay.hidden = true;
    clearHint();
    updateInteractionPrompt();
  }

  function renderEvaluationFeedback(evaluation) {
    feedbackMessage.textContent = evaluation.feedbackGerman;
    feedbackMessage.className = evaluation.isCorrect
      ? "feedback feedback--success"
      : "feedback feedback--error";

    if (evaluation.nextAction === "show_hint") {
      feedbackMessage.textContent = `${evaluation.feedbackGerman} Vorschlag: ${evaluation.correctedSpanish}`;
    }
  }

  function completeBuyLemonadeStep(evaluation) {
    addXp(evaluation.xpReward, "buy_lemonade:correct");
    addInventoryItem(evaluation.inventoryReward);
    state.currentStep = "bring_to_carlos";
    updateQuestTitle();
  }

  function completeCarlosStep(evaluation) {
    addXp(evaluation.xpReward, "bring_to_carlos:correct");
    removeInventoryItem("Limonade");
    state.questStatus = "completed";
    updateQuestTitle();
    feedbackMessage.textContent =
      "Quest abgeschlossen! Du hast gelernt, ein Getränk zu bestellen und jemandem ein Item zu geben.";
    feedbackMessage.className = "feedback feedback--success";
  }

  function applyEvaluationResult(evaluation, step) {
    renderEvaluationFeedback(evaluation);

    if (evaluation.result === "partial") {
      addXp(evaluation.xpReward, `${step.id}:partial`);
      return;
    }

    if (!evaluation.isCorrect) {
      return;
    }

    if (step.id === "buy_lemonade") {
      completeBuyLemonadeStep(evaluation);
      return;
    }

    if (step.id === "bring_to_carlos") {
      completeCarlosStep(evaluation);
    }
  }

  async function handleSubmitAnswer() {
    const userAnswer = answerInput.value;
    state.lastUserAnswer = userAnswer;

    if (state.questStatus === "completed") {
      feedbackMessage.textContent = "Quest abgeschlossen.";
      feedbackMessage.className = "feedback feedback--success";
      return;
    }

    if (!state.activeDialogTarget) {
      feedbackMessage.textContent = "Gehe zum aktuellen Questziel und sprich dort mit der richtigen Person.";
      feedbackMessage.className = "feedback feedback--error";
      return;
    }

    if (!userAnswer.trim()) {
      feedbackMessage.textContent = "Schreib eine kurze Antwort auf Spanisch.";
      feedbackMessage.className = "feedback feedback--error";
      return;
    }

    const step = state.activeDialogTarget.step;
    submitButton.disabled = true;
    feedbackMessage.textContent = "Antwort wird bewertet...";
    feedbackMessage.className = "feedback";
    clearHint();

    try {
      const evaluation = await aiClient.evaluateAnswer(userAnswer, buildQuestContext(step));
      applyEvaluationResult(evaluation, step);
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
    if (state.questStatus === "completed") {
      feedbackMessage.textContent = "Quest abgeschlossen.";
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

    const step = state.activeDialogTarget.step;
    const lastUserAnswer = answerInput.value.trim() || state.lastUserAnswer;

    helpButton.disabled = true;
    feedbackMessage.textContent = "Hilfe wird vorbereitet...";
    feedbackMessage.className = "feedback";
    clearHint();

    try {
      const hint = await aiClient.generateHint(buildQuestContext(step), lastUserAnswer, state.hintLevel);
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
    if (!state.dialogOpen && !state.sidequestOpen) {
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

    if (key === "m" && !state.dialogOpen && !state.sidequestOpen && event.target !== answerInput) {
      showRandomSidequest();
    }

    if (key === "e" && !state.dialogOpen && !state.sidequestOpen) {
      const target = getCurrentInteractionTarget();

      if (target) {
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
    updatePlayerPosition();
    updateInteractionPrompt();
  });

  submitButton.addEventListener("click", handleSubmitAnswer);
  helpButton.addEventListener("click", handleHelpRequest);
  closeDialogButton.addEventListener("click", closeDialog);
  closeDialogXButton.addEventListener("click", closeDialog);
  sidequestButton.addEventListener("click", showRandomSidequest);
  closeSidequestButton.addEventListener("click", closeSidequest);
  closeSidequestXButton.addEventListener("click", closeSidequest);

  answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleSubmitAnswer();
    }
  });

  updatePlayerPosition();
  renderInventory();
  gameLoop();
})();
