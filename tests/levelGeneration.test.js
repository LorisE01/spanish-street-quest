const assert = require("node:assert/strict");
const test = require("node:test");

const {
  extractOutputText,
  getItemChoicePool,
  getScenarioById,
  normalizeItemChoices,
  normalizeLevel
} = require("../server");

function createRepairableBusStopLevel() {
  return {
    levelId: "test_bus_stop",
    scenarioId: "bus_stop",
    titleGerman: "Unterwegs in der Stadt",
    descriptionGerman: "Finde am Bussteig heraus, wie du zum Hotel kommst.",
    backgroundTheme: "modern_city",
    playerStartX: 100,
    vocabularyPreview: [
      { de: "Hallo", es: "hola", exampleSpanish: "Hola.", exampleGerman: "Hallo." },
      { de: "Hilfe", es: "ayuda", exampleSpanish: "Ayuda, por favor.", exampleGerman: "Hilfe, bitte." },
      { de: "wo", es: "dónde", exampleSpanish: "¿Dónde?", exampleGerman: "Wo?" },
      { de: "Hotel", es: "hotel", exampleSpanish: "El hotel.", exampleGerman: "Das Hotel." }
    ],
    locations: [
      {
        id: "bus_stop",
        type: "station",
        labelGerman: "Bushaltestelle",
        x: 180,
        width: 200,
        theme: "bus",
        isRelevant: false
      },
      {
        id: "hotel",
        type: "service",
        labelGerman: "Hotel",
        x: 680,
        width: 220,
        theme: "hotel",
        isRelevant: true
      }
    ],
    npcs: [
      {
        id: "bus_driver",
        nameGerman: "Busfahrer",
        role: "quest_npc",
        x: 300,
        nearLocationId: "bus_stop",
        appearsAtTask: 1,
        leavesAfterTask: 1
      },
      {
        id: "tourist",
        nameGerman: "Touristin",
        role: "ambient_npc",
        x: 760,
        nearLocationId: "hotel",
        appearsAtTask: 3,
        leavesAfterTask: 1
      }
    ],
    items: [
      { id: "billete", nameGerman: "Fahrkarte", nameSpanish: "billete", category: "ticket" },
      { id: "llave", nameGerman: "Schlüssel", nameSpanish: "llave", category: "key" }
    ],
    tasks: [
      {
        taskId: "ask_driver",
        order: 1,
        taskType: "free_text",
        wordOrder: null,
        sentenceGap: null,
        titleGerman: "Bitte um Hilfe",
        instructionGerman: "Bitte den Busfahrer um Hilfe.",
        locationId: "bus_stop",
        npcId: "bus_driver",
        npcName: "Busfahrer",
        npcSpanish: "Hola, ¿en qué puedo ayudarte?",
        expectedIntent: "Der Nutzer begrüßt den Busfahrer und bittet um Hilfe.",
        expectedExamples: ["Hola, necesito ayuda."],
        requiredVocabulary: ["hola", "ayuda"],
        rewardXp: 15,
        rewardItem: "billete",
        requiredItem: null,
        removeItemOnSuccess: null,
        itemSelectionItem: "billete",
        successMessageGerman: "Der Busfahrer hilft dir weiter."
      },
      {
        taskId: "ask_tourist",
        order: 2,
        taskType: "word_order",
        wordOrder: {
          tiles: ["hotel", "el"],
          correctOrder: ["el", "hotel"]
        },
        sentenceGap: null,
        titleGerman: "Nach dem Hotel fragen",
        instructionGerman: "Frage nach dem Hotel.",
        locationId: "hotel",
        npcId: "tourist",
        npcName: "Touristin",
        npcSpanish: "Hola, ¿qué buscas?",
        expectedIntent: "Der Nutzer fragt, wo das Hotel ist.",
        expectedExamples: ["¿Dónde está el hotel?"],
        requiredVocabulary: ["dónde", "hotel"],
        rewardXp: 15,
        rewardItem: null,
        requiredItem: "llave",
        removeItemOnSuccess: "llave",
        itemSelectionItem: "llave",
        successMessageGerman: "Du hast das Hotel gefunden."
      }
    ],
    summaryGerman: "Du hast unterwegs nach Hilfe und dem richtigen Ort gefragt."
  };
}

test("normalizeLevel repairs harmless model inconsistencies", () => {
  const scenario = getScenarioById("bus_stop");
  const level = normalizeLevel(
    createRepairableBusStopLevel(),
    scenario,
    ["word_order", "free_text"]
  );

  assert.deepEqual(level.locations.map((location) => location.id), ["bus_stop", "hotel"]);
  assert.equal(level.tasks[0].taskType, "word_order");
  assert.deepEqual(level.tasks[0].wordOrder.correctOrder, ["Hola,", "necesito", "ayuda."]);
  assert.equal(level.tasks[1].taskType, "free_text");
  assert.equal(level.tasks[0].rewardItem, null);
  assert.equal(level.tasks[0].itemSelectionItem, null);
  assert.equal(level.tasks[1].requiredItem, null);
  assert.equal(level.tasks[1].removeItemOnSuccess, null);
  assert.equal(level.tasks[1].itemSelectionItem, null);
  assert.deepEqual(level.items, []);
  assert.equal(level.npcs.find((npc) => npc.id === "tourist").appearsAtTask, 2);
  assert.equal(level.npcs.find((npc) => npc.id === "tourist").leavesAfterTask, 2);
});

test("normalizeLevel preserves a valid item handoff", () => {
  const scenario = getScenarioById("bus_stop");
  const input = createRepairableBusStopLevel();
  input.tasks[1].requiredItem = "billete";
  input.tasks[1].removeItemOnSuccess = "billete";
  input.tasks[1].itemSelectionItem = null;
  input.tasks[1].instructionGerman = "Zeige der Touristin deine Fahrkarte.";
  input.tasks[1].npcSpanish = "¿Tienes tu billete?";
  input.tasks[1].expectedIntent = "Der Nutzer zeigt der Touristin seine Fahrkarte.";

  const level = normalizeLevel(input, scenario, ["free_text", "free_text"]);

  assert.equal(level.tasks[0].rewardItem, "billete");
  assert.equal(level.tasks[1].requiredItem, "billete");
  assert.equal(level.tasks[1].removeItemOnSuccess, "billete");
  assert.equal(level.tasks[1].itemSelectionItem, "billete");
  assert.deepEqual(level.items.map((item) => item.id), ["billete"]);
});

test("normalizeLevel creates text and drag-and-drop sentence gaps from expected examples", () => {
  const scenario = getScenarioById("bus_stop");
  const level = normalizeLevel(
    createRepairableBusStopLevel(),
    scenario,
    ["sentence_gap", "sentence_gap"],
    ["text", "drag_drop"]
  );

  const textGap = level.tasks[0].sentenceGap;
  const dragGap = level.tasks[1].sentenceGap;
  const completeGap = (gap) => {
    let answerIndex = 0;
    return gap.template.replace(/___/g, () => gap.answers[answerIndex++]);
  };

  assert.equal(level.tasks[0].taskType, "sentence_gap");
  assert.equal(textGap.inputMode, "text");
  assert.equal(textGap.answers.length >= 1 && textGap.answers.length <= 2, true);
  assert.deepEqual(textGap.wordBank, []);
  assert.equal(completeGap(textGap), level.tasks[0].expectedExamples[0]);

  assert.equal(level.tasks[1].taskType, "sentence_gap");
  assert.equal(dragGap.inputMode, "drag_drop");
  assert.equal(dragGap.wordBank.length >= 3, true);
  assert.equal(completeGap(dragGap), level.tasks[1].expectedExamples[0]);
  dragGap.answers.forEach((answer) => {
    assert.equal(dragGap.wordBank.some((word) => word.toLowerCase() === answer.toLowerCase()), true);
  });
});

test("item choices stay inside the current scenario", () => {
  const expectedItem = {
    id: "llave",
    nameGerman: "Schlüssel",
    nameSpanish: "llave",
    category: "hotel"
  };
  const choicePool = getItemChoicePool({ scenarioId: "hotel" }, [], expectedItem);
  const result = normalizeItemChoices(
    {
      choices: [
        { id: "manzana", nameGerman: "Apfel", nameSpanish: "manzana", category: "food" },
        { id: "tarjeta", nameGerman: "Karte", nameSpanish: "tarjeta", category: "document" }
      ]
    },
    expectedItem,
    choicePool
  );
  const choiceIds = new Set(result.choices.map((item) => item.id));

  assert.equal(result.choices.length, 3);
  assert.equal(choiceIds.has("llave"), true);
  assert.equal(choiceIds.has("manzana"), false);
  assert.deepEqual(choiceIds, new Set(["llave", "tarjeta", "billete"]));
});

test("extractOutputText reports incomplete and refused structured outputs", () => {
  assert.equal(
    extractOutputText({ status: "completed", output_text: "{\"ok\":true}" }),
    "{\"ok\":true}"
  );

  assert.throws(
    () => extractOutputText({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }),
    (error) => error.retryable === true && error.message.includes("max_output_tokens")
  );

  assert.throws(
    () => extractOutputText({ status: "failed", error: { code: "server_error" } }),
    (error) => error.retryable === true && error.message.includes("server_error")
  );

  assert.throws(
    () => extractOutputText({
      status: "completed",
      output: [{ content: [{ type: "refusal", refusal: "No" }] }]
    }),
    (error) => error.retryable === false && error.message.includes("refused")
  );
});
