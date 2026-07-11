require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-nano";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_IMAGES_API_URL = "https://api.openai.com/v1/images/generations";
const itemImageCache = new Map();

const evaluationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "result",
    "isCorrect",
    "intentMatched",
    "feedbackGerman",
    "correctedSpanish",
    "hintGerman",
    "xpReward",
    "nextAction",
    "inventoryReward",
    "mistakes"
  ],
  properties: {
    result: {
      type: "string",
      enum: ["correct", "partial", "wrong"]
    },
    isCorrect: {
      type: "boolean"
    },
    intentMatched: {
      type: "boolean"
    },
    feedbackGerman: {
      type: "string"
    },
    correctedSpanish: {
      type: "string"
    },
    hintGerman: {
      type: ["string", "null"]
    },
    xpReward: {
      type: "number"
    },
    nextAction: {
      type: "string",
      enum: ["complete_step", "complete_quest", "retry", "show_hint"]
    },
    inventoryReward: {
      type: ["string", "null"]
    },
    mistakes: {
      type: "array",
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "explanationGerman"],
        properties: {
          type: {
            type: "string"
          },
          explanationGerman: {
            type: "string"
          }
        }
      }
    }
  }
};

const hintSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hintLevel", "hintGerman", "sentenceStarter", "vocabulary", "exampleAnswer"],
  properties: {
    hintLevel: {
      type: "number"
    },
    hintGerman: {
      type: "string"
    },
    sentenceStarter: {
      type: ["string", "null"]
    },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["de", "es"],
        properties: {
          de: {
            type: "string"
          },
          es: {
            type: "string"
          }
        }
      }
    },
    exampleAnswer: {
      type: ["string", "null"]
    }
  }
};

const worldModel = {
  scenarioIds: [
    "street",
    "supermarket",
    "cafe",
    "restaurant",
    "park",
    "bus_stop",
    "hotel",
    "clothing_store",
    "post_office"
  ],
  locationTypes: ["building", "stand", "park", "station", "shop", "service"],
  locations: [
    "street",
    "drink_stand",
    "supermarket",
    "cafe",
    "restaurant",
    "park",
    "bus_stop",
    "hotel",
    "clothing_store",
    "post_office"
  ],
  npcs: [
    "vendor",
    "cashier",
    "waiter",
    "barista",
    "receptionist",
    "postal_worker",
    "bus_driver",
    "shop_assistant",
    "carlos",
    "passerby"
  ],
  learningGoals: [
    "introduce_yourself",
    "order_food",
    "order_drink",
    "buy_food",
    "ask_price",
    "ask_directions",
    "check_in_hotel",
    "ask_for_help",
    "greeting",
    "give_item"
  ],
  items: [
    "limonada",
    "agua",
    "pan",
    "cafe",
    "manzana",
    "billete",
    "dinero",
    "sello",
    "postal",
    "camiseta",
    "zapatos",
    "chaqueta",
    "llave",
    "tarjeta",
    "ensalada",
    "queso",
    "bocadillo",
    "platano"
  ],
  scenarios: [
    {
      id: "street_services",
      allowedLocations: ["street", "bus_stop", "post_office", "hotel", "park"],
      allowedNpcs: ["passerby", "bus_driver", "postal_worker", "receptionist", "carlos"],
      allowedLearningGoals: ["ask_directions", "ask_for_help", "greeting", "check_in_hotel", "give_item"],
      allowedItems: ["billete", "dinero", "sello", "postal", "llave", "tarjeta", "limonada"]
    },
    {
      id: "shops_and_food",
      allowedLocations: ["drink_stand", "supermarket", "cafe", "restaurant", "clothing_store"],
      allowedNpcs: ["vendor", "cashier", "waiter", "barista", "shop_assistant"],
      allowedLearningGoals: ["order_food", "order_drink", "buy_food", "ask_price", "greeting"],
      allowedItems: [
        "limonada",
        "agua",
        "pan",
        "cafe",
        "manzana",
        "dinero",
        "camiseta",
        "zapatos",
        "chaqueta",
        "ensalada",
        "queso",
        "bocadillo",
        "platano"
      ]
    }
  ]
};

const itemChoiceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["choices"],
  properties: {
    choices: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "nameGerman", "nameSpanish", "category"],
        properties: {
          id: {
            type: "string",
            enum: worldModel.items
          },
          nameGerman: {
            type: "string"
          },
          nameSpanish: {
            type: "string"
          },
          category: {
            type: "string"
          }
        }
      }
    }
  }
};

const questSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "questId",
    "titleGerman",
    "descriptionGerman",
    "locationId",
    "npcId",
    "npcName",
    "learningGoal",
    "difficulty",
    "npcSpanish",
    "instructionGerman",
    "expectedIntent",
    "expectedExamples",
    "vocabulary",
    "successReward",
    "summaryGerman"
  ],
  properties: {
    questId: {
      type: "string"
    },
    titleGerman: {
      type: "string"
    },
    descriptionGerman: {
      type: "string"
    },
    locationId: {
      type: "string",
      enum: worldModel.locations
    },
    npcId: {
      type: "string",
      enum: worldModel.npcs
    },
    npcName: {
      type: "string"
    },
    learningGoal: {
      type: "string",
      enum: worldModel.learningGoals
    },
    difficulty: {
      type: "string",
      enum: ["A1"]
    },
    npcSpanish: {
      type: "string"
    },
    instructionGerman: {
      type: "string"
    },
    expectedIntent: {
      type: "string"
    },
    expectedExamples: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "string"
      }
    },
    vocabulary: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["de", "es"],
        properties: {
          de: {
            type: "string"
          },
          es: {
            type: "string"
          }
        }
      }
    },
    successReward: {
      type: "object",
      additionalProperties: false,
      required: ["xp", "item"],
      properties: {
        xp: {
          type: "number"
        },
        item: {
          type: ["string", "null"],
          enum: [...worldModel.items, null]
        }
      }
    },
    summaryGerman: {
      type: "string"
    }
  }
};

const environmentQuestSchema = JSON.parse(JSON.stringify(questSchema));
delete environmentQuestSchema.properties.locationId.enum;

const environmentSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "environmentId",
    "scenarioId",
    "titleGerman",
    "descriptionGerman",
    "backgroundTheme",
    "playerStartX",
    "locations",
    "npcs",
    "items",
    "quest"
  ],
  properties: {
    environmentId: {
      type: "string"
    },
    scenarioId: {
      type: "string",
      enum: worldModel.scenarioIds
    },
    titleGerman: {
      type: "string"
    },
    descriptionGerman: {
      type: "string"
    },
    backgroundTheme: {
      type: "string"
    },
    playerStartX: {
      type: "number"
    },
    locations: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "labelGerman", "x", "width", "theme"],
        properties: {
          id: {
            type: "string"
          },
          type: {
            type: "string",
            enum: worldModel.locationTypes
          },
          labelGerman: {
            type: "string"
          },
          x: {
            type: "number"
          },
          width: {
            type: "number"
          },
          theme: {
            type: "string"
          }
        }
      }
    },
    npcs: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "nameGerman", "role", "x", "nearLocationId", "appearsAtTask", "leavesAfterTask"],
        properties: {
          id: {
            type: "string",
            enum: worldModel.npcs
          },
          nameGerman: {
            type: "string"
          },
          role: {
            type: "string",
            enum: ["quest_npc", "ambient_npc"]
          },
          x: {
            type: "number"
          },
          nearLocationId: {
            type: "string"
          },
          appearsAtTask: {
            type: "number"
          },
          leavesAfterTask: {
            type: ["number", "null"]
          }
        }
      }
    },
    items: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "nameGerman", "nameSpanish", "category"],
        properties: {
          id: {
            type: "string",
            enum: worldModel.items
          },
          nameGerman: {
            type: "string"
          },
          nameSpanish: {
            type: "string"
          },
          category: {
            type: "string"
          }
        }
      }
    },
    quest: environmentQuestSchema
  }
};

const levelTaskSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "taskId",
    "order",
    "titleGerman",
    "instructionGerman",
    "locationId",
    "npcId",
    "npcName",
    "npcSpanish",
    "expectedIntent",
    "expectedExamples",
    "requiredVocabulary",
    "rewardXp",
    "rewardItem",
    "requiredItem",
    "removeItemOnSuccess",
    "successMessageGerman"
  ],
  properties: {
    taskId: { type: "string" },
    order: { type: "number" },
    titleGerman: { type: "string" },
    instructionGerman: { type: "string" },
    locationId: { type: "string" },
    npcId: { type: "string", enum: worldModel.npcs },
    npcName: { type: "string" },
    npcSpanish: { type: "string" },
    expectedIntent: { type: "string" },
    expectedExamples: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" }
    },
    requiredVocabulary: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" }
    },
    rewardXp: { type: "number" },
    rewardItem: { type: ["string", "null"], enum: [...worldModel.items, null] },
    requiredItem: { type: ["string", "null"], enum: [...worldModel.items, null] },
    removeItemOnSuccess: { type: ["string", "null"], enum: [...worldModel.items, null] },
    successMessageGerman: { type: "string" }
  }
};

const levelSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "levelId",
    "scenarioId",
    "titleGerman",
    "descriptionGerman",
    "backgroundTheme",
    "playerStartX",
    "vocabularyPreview",
    "locations",
    "npcs",
    "items",
    "tasks",
    "summaryGerman"
  ],
  properties: {
    levelId: { type: "string" },
    scenarioId: { type: "string", enum: worldModel.scenarioIds },
    titleGerman: { type: "string" },
    descriptionGerman: { type: "string" },
    backgroundTheme: { type: "string" },
    playerStartX: { type: "number" },
    vocabularyPreview: {
      type: "array",
      minItems: 4,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["de", "es", "exampleSpanish", "exampleGerman"],
        properties: {
          de: { type: "string" },
          es: { type: "string" },
          exampleSpanish: { type: "string" },
          exampleGerman: { type: "string" }
        }
      }
    },
    locations: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "labelGerman", "x", "width", "theme", "isRelevant"],
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: worldModel.locationTypes },
          labelGerman: { type: "string" },
          x: { type: "number" },
          width: { type: "number" },
          theme: { type: "string" },
          isRelevant: { type: "boolean" }
        }
      }
    },
    npcs: environmentSchema.properties.npcs,
    items: environmentSchema.properties.items,
    tasks: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: levelTaskSchema
    },
    summaryGerman: { type: "string" }
  }
};

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Spanish Street Quest server läuft."
  });
});

function normalizeAnswer(answer) {
  return String(answer)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getSafeQuestContext(questContext) {
  return questContext && typeof questContext === "object" ? questContext : {};
}

function sanitizePromptValue(value, maxLength = 48) {
  return String(value || "")
    .replace(/[^\w\s.,-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapeSvgText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSafeItem(item) {
  const fallbackId = worldModel.items[0];
  const rawItem = item && typeof item === "object" ? item : {};
  const id = worldModel.items.includes(rawItem.id) ? rawItem.id : fallbackId;

  return {
    id,
    nameGerman: String(rawItem.nameGerman || id),
    nameSpanish: String(rawItem.nameSpanish || id),
    category: String(rawItem.category || "item")
  };
}

function getWorldItemDetails(itemId) {
  const catalog = {
    limonada: { nameGerman: "Limonade", nameSpanish: "limonada", category: "drink" },
    agua: { nameGerman: "Wasser", nameSpanish: "agua", category: "drink" },
    pan: { nameGerman: "Brot", nameSpanish: "pan", category: "food" },
    cafe: { nameGerman: "Kaffee", nameSpanish: "cafe", category: "drink" },
    manzana: { nameGerman: "Apfel", nameSpanish: "manzana", category: "food" },
    billete: { nameGerman: "Ticket", nameSpanish: "billete", category: "document" },
    dinero: { nameGerman: "Geld", nameSpanish: "dinero", category: "money" },
    sello: { nameGerman: "Briefmarke", nameSpanish: "sello", category: "postal" },
    postal: { nameGerman: "Postkarte", nameSpanish: "postal", category: "postal" },
    camiseta: { nameGerman: "T-Shirt", nameSpanish: "camiseta", category: "clothing" },
    zapatos: { nameGerman: "Schuhe", nameSpanish: "zapatos", category: "clothing" },
    chaqueta: { nameGerman: "Jacke", nameSpanish: "chaqueta", category: "clothing" },
    llave: { nameGerman: "Schluessel", nameSpanish: "llave", category: "hotel" },
    tarjeta: { nameGerman: "Karte", nameSpanish: "tarjeta", category: "document" },
    ensalada: { nameGerman: "Salat", nameSpanish: "ensalada", category: "food" },
    queso: { nameGerman: "Kaese", nameSpanish: "queso", category: "food" },
    bocadillo: { nameGerman: "Sandwich", nameSpanish: "bocadillo", category: "food" },
    platano: { nameGerman: "Banane", nameSpanish: "platano", category: "food" }
  };

  return {
    id: worldModel.items.includes(itemId) ? itemId : worldModel.items[0],
    ...(catalog[itemId] || {
      nameGerman: itemId,
      nameSpanish: itemId,
      category: "item"
    })
  };
}

function getExpectedItemFromRequest(expectedItem, taskContext) {
  if (expectedItem && typeof expectedItem === "object" && worldModel.items.includes(expectedItem.id)) {
    return getSafeItem(expectedItem);
  }

  const expectedItemId =
    taskContext.expectedItemId || taskContext.removeItemOnSuccess || taskContext.requiredItem || taskContext.rewardItem;

  return getWorldItemDetails(expectedItemId);
}

function shuffleItems(items) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => entry.item);
}

function normalizeItemChoices(rawChoices, expectedItem) {
  const expected = getSafeItem(expectedItem);
  const choices = Array.isArray(rawChoices?.choices) ? rawChoices.choices : [];
  const uniqueChoices = new Map();

  uniqueChoices.set(expected.id, expected);

  choices.forEach((choice) => {
    const safeChoice = getSafeItem(choice);

    if (worldModel.items.includes(safeChoice.id) && !uniqueChoices.has(safeChoice.id)) {
      uniqueChoices.set(safeChoice.id, safeChoice);
    }
  });

  const fallbackPool = worldModel.items
    .filter((itemId) => itemId !== expected.id)
    .map(getWorldItemDetails)
    .filter((item) => !uniqueChoices.has(item.id));

  for (const fallbackItem of shuffleItems(fallbackPool)) {
    if (uniqueChoices.size >= 3) {
      break;
    }

    uniqueChoices.set(fallbackItem.id, fallbackItem);
  }

  return {
    choices: shuffleItems([...uniqueChoices.values()].slice(0, 3))
  };
}

function getDummyItemChoices(expectedItem) {
  return normalizeItemChoices({ choices: [] }, expectedItem);
}

function getFallbackItemImage(item) {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
    '<rect width="128" height="128" rx="14" fill="#f6f8fb"/>',
    '<rect x="18" y="18" width="92" height="92" rx="10" fill="#f5b942" stroke="#1d2433" stroke-width="5"/>',
    '<rect x="33" y="34" width="62" height="42" rx="7" fill="#fff4bf" stroke="#1d2433" stroke-width="4"/>',
    '<rect x="41" y="83" width="46" height="12" rx="3" fill="#1d2433" opacity="0.35"/>',
    '<circle cx="86" cy="36" r="8" fill="#ffffff" opacity="0.72"/>',
    "</svg>"
  ].join("");

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildItemImagePrompt(item, taskContext = {}) {
  const safeItem = getSafeItem(item);
  const taskIntent = sanitizePromptValue(taskContext.expectedIntent || taskContext.instructionGerman, 120);

  return [
    "Create one clean pixel art inventory icon for a browser-based Spanish learning game.",
    "Show a single everyday object, centered, no person, no text, no letters, no labels, no UI.",
    "Use a simple transparent or light background and a readable 1:1 icon silhouette.",
    `Object German name: ${sanitizePromptValue(safeItem.nameGerman)}.`,
    `Object Spanish name: ${sanitizePromptValue(safeItem.nameSpanish)}.`,
    `Category: ${sanitizePromptValue(safeItem.category)}.`,
    taskIntent ? `Learning task context: ${taskIntent}.` : "",
    "Style: friendly pixel art, crisp edges, suitable as a small inventory item."
  ]
    .filter(Boolean)
    .join(" ");
}

function buildItemChoicesPrompt(expectedItem, taskContext = {}, availableItems = []) {
  const safeExpectedItem = getSafeItem(expectedItem);
  const safeAvailableItems = Array.isArray(availableItems)
    ? availableItems.map(getSafeItem).filter((item) => worldModel.items.includes(item.id))
    : [];
  const choicePool = [...new Map([...safeAvailableItems, ...worldModel.items.map(getWorldItemDetails)].map((item) => [item.id, item])).values()];

  return [
    "Generate item choices for a Spanish learning game interaction dialog.",
    "Return only structured JSON that matches the schema.",
    "The choices are clickable inventory-style options for a beginner task.",
    "Return exactly 3 choices: the expected item and 2 distractor items.",
    "Include the expected item exactly once.",
    "Add plausible distractor items that fit the situation but are not the correct answer.",
    "Use only item ids from the provided choicePool.",
    "Use lowercase Spanish item names, no explanations, no full sentences.",
    "Do not reveal which item is correct.",
    `Expected item: ${JSON.stringify(safeExpectedItem)}`,
    `Task context: ${JSON.stringify({
      instructionGerman: taskContext.instructionGerman,
      expectedIntent: taskContext.expectedIntent,
      npcSpanish: taskContext.npcSpanish,
      scenarioId: taskContext.scenarioId
    })}`,
    `choicePool: ${JSON.stringify(choicePool)}`
  ].join("\n");
}

function evaluateBuyLemonade(normalizedAnswer, questContext) {
  const includesQuiero = normalizedAnswer.includes("quiero");
  const includesLimonada = normalizedAnswer.includes("limonada");

  if (includesQuiero && includesLimonada) {
    return {
      result: "correct",
      isCorrect: true,
      intentMatched: true,
      feedbackGerman: "Sehr gut! Du hast erfolgreich eine Limonade bestellt.",
      correctedSpanish: "Quiero una limonada, por favor.",
      xpReward: 20,
      nextAction: "complete_step",
      inventoryReward: "Limonade",
      mistakes: []
    };
  }

  if (includesLimonada) {
    return {
      result: "partial",
      isCorrect: false,
      intentMatched: true,
      feedbackGerman:
        "Fast richtig! Du hast erkannt, dass es um eine Limonade geht. Versuche einen vollständigen Satz mit „Quiero...“ zu bilden.",
      correctedSpanish: "Quiero una limonada, por favor.",
      xpReward: 5,
      nextAction: "retry",
      inventoryReward: null,
      mistakes: [
        {
          type: "missing_verb",
          explanationGerman: "Der Satz enthält zwar das Getränk, aber noch nicht klar den Wunsch mit „Quiero“."
        }
      ]
    };
  }

  return {
    result: "wrong",
    isCorrect: false,
    intentMatched: false,
    feedbackGerman: "Noch nicht ganz. Du möchtest sagen: „Ich möchte eine Limonade.“",
    correctedSpanish: "Quiero una limonada, por favor.",
    xpReward: 0,
    nextAction: "show_hint",
    inventoryReward: null,
    mistakes: [
      {
        type: "intent_not_matched",
        explanationGerman: "Die Antwort erwähnt noch nicht, dass du eine Limonade bestellen möchtest."
      }
    ]
  };
}

function evaluateBringToCarlos(normalizedAnswer) {
  const includesLimonada = normalizedAnswer.includes("limonada");
  const hasGiveIntent = normalizedAnswer.includes("tengo") || normalizedAnswer.includes("aqui tienes");

  if (hasGiveIntent && includesLimonada) {
    return {
      result: "correct",
      isCorrect: true,
      intentMatched: true,
      feedbackGerman: "Sehr gut! Du hast Carlos die Limonade gegeben.",
      correctedSpanish: "Sí, tengo tu limonada.",
      xpReward: 25,
      nextAction: "complete_quest",
      inventoryReward: null,
      mistakes: []
    };
  }

  if (includesLimonada) {
    return {
      result: "partial",
      isCorrect: false,
      intentMatched: true,
      feedbackGerman: "Fast richtig! Du hast die Limonade erwähnt. Versuche zu sagen, dass du sie hast.",
      correctedSpanish: "Sí, tengo tu limonada.",
      xpReward: 5,
      nextAction: "retry",
      inventoryReward: null,
      mistakes: [
        {
          type: "sentence_structure",
          explanationGerman: "Für diese Situation brauchst du einen vollständigen Satz wie „Tengo tu limonada“."
        }
      ]
    };
  }

  return {
    result: "wrong",
    isCorrect: false,
    intentMatched: false,
    feedbackGerman: "Noch nicht ganz. Carlos fragt, ob du seine Limonade hast.",
    correctedSpanish: "Sí, tengo tu limonada.",
    xpReward: 0,
    nextAction: "show_hint",
    inventoryReward: null,
    mistakes: [
      {
        type: "intent",
        explanationGerman: "Die Antwort passt noch nicht zur Frage von Carlos."
      }
    ]
  };
}

function evaluateGeneratedQuest(normalizedAnswer, questContext) {
  const expectedExamples = Array.isArray(questContext.expectedExamples) ? questContext.expectedExamples : [];
  const correctedSpanish = String(expectedExamples[0] || "Responde en español.");
  const expectedTokens = expectedExamples
    .flatMap((example) => normalizeAnswer(example).split(/\s+/))
    .filter((token) => token.length > 2 && !["una", "uno", "con", "por", "para"].includes(token));
  const uniqueExpectedTokens = [...new Set(expectedTokens)];
  const matchedTokenCount = uniqueExpectedTokens.filter((token) => normalizedAnswer.includes(token)).length;

  if (matchedTokenCount >= Math.min(2, uniqueExpectedTokens.length)) {
    return {
      result: "correct",
      isCorrect: true,
      intentMatched: true,
      feedbackGerman: "Sehr gut! Du hast die Alltagssituation passend auf Spanisch gelöst.",
      correctedSpanish,
      xpReward: getSafeGeneratedReward(questContext).xp,
      nextAction: "complete_quest",
      inventoryReward: getSafeGeneratedReward(questContext).item,
      mistakes: []
    };
  }

  if (matchedTokenCount > 0) {
    return {
      result: "partial",
      isCorrect: false,
      intentMatched: true,
      feedbackGerman: "Fast richtig! Ein Teil deiner Antwort passt schon zur Situation.",
      correctedSpanish,
      xpReward: 5,
      nextAction: "retry",
      inventoryReward: null,
      mistakes: [
        {
          type: "intent",
          explanationGerman: "Formuliere den Satz noch vollständiger passend zur Aufgabe."
        }
      ]
    };
  }

  return {
    result: "wrong",
    isCorrect: false,
    intentMatched: false,
    feedbackGerman: "Noch nicht ganz. Lies die Aufgabe und antworte mit einem kurzen spanischen Satz.",
    correctedSpanish,
    xpReward: 0,
    nextAction: "show_hint",
    inventoryReward: null,
    mistakes: [
      {
        type: "intent",
        explanationGerman: "Die Antwort passt noch nicht klar zur aktuellen Alltagssituation."
      }
    ]
  };
}

function evaluateGeneratedLevelTask(normalizedAnswer, questContext) {
  const expectedExamples = Array.isArray(questContext.expectedExamples) ? questContext.expectedExamples : [];
  const requiredVocabulary = Array.isArray(questContext.requiredVocabulary) ? questContext.requiredVocabulary : [];
  const correctedSpanish = String(expectedExamples[0] || "Responde en español.");
  const expectedTokens = [...expectedExamples, ...requiredVocabulary]
    .flatMap((value) => normalizeAnswer(value).split(/\s+/))
    .filter((token) => token.length > 2 && !["una", "uno", "con", "por", "para", "que"].includes(token));
  const uniqueExpectedTokens = [...new Set(expectedTokens)];
  const matchedTokenCount = uniqueExpectedTokens.filter((token) => normalizedAnswer.includes(token)).length;
  const requiredMatchCount = requiredVocabulary.filter((word) => normalizedAnswer.includes(normalizeAnswer(word))).length;

  if (requiredMatchCount >= Math.min(1, requiredVocabulary.length) && matchedTokenCount >= 1) {
    return {
      result: "correct",
      isCorrect: true,
      intentMatched: true,
      feedbackGerman: "Sehr gut! Deine Antwort passt zur Aufgabe.",
      correctedSpanish,
      xpReward: 0,
      nextAction: "complete_quest",
      inventoryReward: null,
      mistakes: []
    };
  }

  if (matchedTokenCount > 0 || requiredMatchCount > 0) {
    return {
      result: "partial",
      isCorrect: false,
      intentMatched: true,
      feedbackGerman: "Fast richtig! Nutze noch einen vollständigen kurzen Satz.",
      correctedSpanish,
      xpReward: 0,
      nextAction: "retry",
      inventoryReward: null,
      mistakes: [
        {
          type: "a1_sentence",
          explanationGerman: "Nimm die Vokabeln aus der Vorschau und formuliere einen kurzen Satz."
        }
      ]
    };
  }

  return {
    result: "wrong",
    isCorrect: false,
    intentMatched: false,
    feedbackGerman: "Noch nicht ganz. Schau dir die Vokabeln an und antworte kurz auf Spanisch.",
    correctedSpanish,
    xpReward: 0,
    nextAction: "show_hint",
    inventoryReward: null,
    mistakes: [
      {
        type: "intent",
        explanationGerman: "Die Antwort passt noch nicht zur aktuellen Aufgabe."
      }
    ]
  };
}

function getDummyEvaluation(normalizedAnswer, questContext) {
  if (questContext.currentStep === "generated_level_task") {
    return evaluateGeneratedLevelTask(normalizedAnswer, questContext);
  }

  if (questContext.currentStep === "generated_quest") {
    return evaluateGeneratedQuest(normalizedAnswer, questContext);
  }

  if (questContext.currentStep === "bring_to_carlos") {
    return evaluateBringToCarlos(normalizedAnswer);
  }

  return evaluateBuyLemonade(normalizedAnswer, questContext);
}

function getCompletedQuestEvaluation() {
  return {
    result: "wrong",
    isCorrect: false,
    intentMatched: false,
    feedbackGerman: "Diese Quest ist bereits abgeschlossen.",
    correctedSpanish: "",
    xpReward: 0,
    nextAction: "show_hint",
    inventoryReward: null,
    mistakes: []
  };
}

function getFallbackGeneratedQuest() {
  return {
    questId: "fallback_order_limonada",
    titleGerman: "Bestelle eine Limonade",
    descriptionGerman: "Sprich mit dem Verkäufer am Getränkestand und bestelle eine Limonade auf Spanisch.",
    locationId: "drink_stand",
    npcId: "vendor",
    npcName: "Verkäufer",
    learningGoal: "order_drink",
    difficulty: "A1",
    npcSpanish: "Hola, ¿qué quieres beber?",
    instructionGerman: "Bestelle höflich eine Limonade auf Spanisch.",
    expectedIntent: "Der Nutzer möchte eine Limonade bestellen.",
    expectedExamples: ["Quiero una limonada, por favor.", "Quiero una limonada."],
    vocabulary: [
      {
        de: "ich möchte",
        es: "quiero"
      },
      {
        de: "eine Limonade",
        es: "una limonada"
      },
      {
        de: "bitte",
        es: "por favor"
      }
    ],
    successReward: {
      xp: 20,
      item: "limonada"
    },
    summaryGerman: "Du hast gelernt, höflich ein Getränk zu bestellen."
  };
}

function getFallbackEnvironment() {
  const quest = getFallbackGeneratedQuest();

  return {
    environmentId: "fallback_bebidas_street",
    scenarioId: "street",
    titleGerman: "Straße mit Getränkestand",
    descriptionGerman: "Eine einfache Stadtstraße mit einem Getränkestand und einem Verkäufer.",
    backgroundTheme: "modern_city",
    playerStartX: 120,
    locations: [
      {
        id: "drink_stand",
        type: "stand",
        labelGerman: "Getränkestand",
        x: 390,
        width: 170,
        theme: "bebidas"
      },
      {
        id: "park",
        type: "park",
        labelGerman: "Kleiner Park",
        x: 760,
        width: 160,
        theme: "trees"
      }
    ],
    npcs: [
      {
        id: "vendor",
        nameGerman: "Verkäufer",
        role: "quest_npc",
        x: 500,
        nearLocationId: "drink_stand",
        appearsAtTask: 1,
        leavesAfterTask: null
      },
      {
        id: "carlos",
        nameGerman: "Carlos",
        role: "ambient_npc",
        x: 820,
        nearLocationId: "park",
        appearsAtTask: 1,
        leavesAfterTask: null
      }
    ],
    items: [
      {
        id: "limonada",
        nameGerman: "Limonade",
        nameSpanish: "limonada",
        category: "drink"
      }
    ],
    quest
  };
}

function getFallbackLevel() {
  return {
    levelId: "fallback_level_bebidas",
    scenarioId: "street",
    titleGerman: "Am Getränkestand",
    descriptionGerman: "Du übst einfache Sätze am Getränkestand und gibst ein Getränk weiter.",
    backgroundTheme: "modern_city",
    playerStartX: 120,
    vocabularyPreview: [
      {
        de: "Hallo",
        es: "hola",
        exampleSpanish: "Hola.",
        exampleGerman: "Hallo."
      },
      {
        de: "ich möchte",
        es: "quiero",
        exampleSpanish: "Quiero agua.",
        exampleGerman: "Ich möchte Wasser."
      },
      {
        de: "eine Limonade",
        es: "una limonada",
        exampleSpanish: "La limonada, por favor.",
        exampleGerman: "Ich möchte eine Limonade."
      },
      {
        de: "bitte",
        es: "por favor",
        exampleSpanish: "Por favor.",
        exampleGerman: "Bitte."
      },
      {
        de: "ich habe",
        es: "tengo",
        exampleSpanish: "Tengo agua.",
        exampleGerman: "Ich habe Wasser."
      }
    ],
    locations: [
      {
        id: "drink_stand",
        type: "stand",
        labelGerman: "Getränkestand",
        x: 390,
        width: 170,
        theme: "bebidas",
        isRelevant: true
      },
      {
        id: "park",
        type: "park",
        labelGerman: "Park",
        x: 760,
        width: 160,
        theme: "trees",
        isRelevant: true
      }
    ],
    npcs: [
      {
        id: "vendor",
        nameGerman: "Verkäufer",
        role: "quest_npc",
        x: 500,
        nearLocationId: "drink_stand",
        appearsAtTask: 1,
        leavesAfterTask: 1
      },
      {
        id: "carlos",
        nameGerman: "Carlos",
        role: "ambient_npc",
        x: 820,
        nearLocationId: "park",
        appearsAtTask: 2,
        leavesAfterTask: null
      }
    ],
    items: [
      {
        id: "limonada",
        nameGerman: "Limonade",
        nameSpanish: "limonada",
        category: "drink"
      }
    ],
    tasks: [
      {
        taskId: "order_limonada",
        order: 1,
        titleGerman: "Getränk bestellen",
        instructionGerman: "Bestelle ein Getränk.",
        locationId: "drink_stand",
        npcId: "vendor",
        npcName: "Verkäufer",
        npcSpanish: "Hola, ¿qué quieres?",
        expectedIntent: "Der Nutzer möchte eine Limonade bestellen.",
        expectedExamples: ["Quiero una limonada, por favor.", "Quiero una limonada."],
        requiredVocabulary: ["quiero", "limonada"],
        rewardXp: 15,
        rewardItem: "limonada",
        requiredItem: null,
        removeItemOnSuccess: null,
        successMessageGerman: "Gut gemacht! Die Limonade ist jetzt in deinem Inventar."
      },
      {
        taskId: "give_limonada",
        order: 2,
        titleGerman: "Getränk weitergeben",
        instructionGerman: "Gib Carlos das Getränk.",
        locationId: "park",
        npcId: "carlos",
        npcName: "Carlos",
        npcSpanish: "¿Tienes mi limonada?",
        expectedIntent: "Der Nutzer sagt Carlos, dass er die Limonade hat.",
        expectedExamples: ["Sí, tengo tu limonada.", "Tengo tu limonada."],
        requiredVocabulary: ["sí", "tengo", "limonada"],
        rewardXp: 15,
        rewardItem: null,
        requiredItem: "limonada",
        removeItemOnSuccess: "limonada",
        successMessageGerman: "Sehr gut! Du hast Carlos die Limonade gegeben."
      }
    ],
    summaryGerman: "Level abgeschlossen! Du hast ein Getränk bestellt und es weitergegeben."
  };
}

function isAllowedWorldValue(listName, value) {
  return worldModel[listName].includes(value);
}

function getSafeGeneratedReward(questContext) {
  const requestedReward = questContext.successReward || {};
  const rewardItem = requestedReward.item;

  return {
    xp: Math.max(5, Math.min(Number(requestedReward.xp) || 20, 30)),
    item: rewardItem && isAllowedWorldValue("items", rewardItem) ? rewardItem : null
  };
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(min, Math.min(numericValue, max));
}

function normalizeForSolutionLeakCheck(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:"'`´“”„]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasForbiddenSolutionCue(value) {
  const text = normalizeForSolutionLeakCheck(value);
  const forbiddenCues = [
    "sage",
    "schreibe",
    "antworte mit",
    "benutze den satz",
    "di",
    "la respuesta correcta",
    "debes decir"
  ];

  return forbiddenCues.some((cue) => {
    if (cue === "sage" || cue === "schreibe" || cue === "di") {
      return text.startsWith(`${cue} `);
    }

    return text.includes(cue);
  });
}

function assertVisibleTextDoesNotRevealSolution(fieldName, value, expectedExamples) {
  if (hasForbiddenSolutionCue(value)) {
    throw new Error(`Generated level leaks a solution cue in ${fieldName}.`);
  }

  const visibleText = normalizeForSolutionLeakCheck(value);

  for (const example of expectedExamples) {
    const normalizedExample = normalizeForSolutionLeakCheck(example);

    if (normalizedExample.length >= 8 && visibleText.includes(normalizedExample)) {
      throw new Error(`Generated level repeats an expected example in ${fieldName}.`);
    }
  }
}

function getSafeVocabularyExample(entry) {
  const spanishTerm = String(entry.es || "").trim();

  if (!spanishTerm) {
    return "Practica esta palabra.";
  }

  const words = spanishTerm.split(/\s+/);

  if (words.length >= 3) {
    return `${words[0]}.`;
  }

  return spanishTerm.endsWith(".") ? spanishTerm : `${spanishTerm}.`;
}

function sanitizeVocabularyPreview(vocabularyPreview, expectedExamples) {
  const normalizedExamples = new Set(
    expectedExamples
      .map((example) => normalizeForSolutionLeakCheck(example))
      .filter((example) => example.length >= 8)
  );

  return vocabularyPreview.map((entry) => {
    const normalizedPreviewExample = normalizeForSolutionLeakCheck(entry.exampleSpanish);

    if (normalizedExamples.has(normalizedPreviewExample)) {
      return {
        ...entry,
        exampleSpanish: getSafeVocabularyExample(entry),
        exampleGerman: "Übe diese Vokabel."
      };
    }

    return entry;
  });
}

function normalizeEnvironment(environment) {
  if (!environment || typeof environment !== "object") {
    throw new Error("Generated environment is not an object.");
  }

  if (!worldModel.scenarioIds.includes(environment.scenarioId)) {
    throw new Error("Generated environment contains an invalid scenarioId.");
  }

  const locations = Array.isArray(environment.locations)
    ? environment.locations.slice(0, 5).map((location, index) => ({
        id: String(location.id || `location_${index}`),
        type: worldModel.locationTypes.includes(location.type) ? location.type : "building",
        labelGerman: String(location.labelGerman || "Ort"),
        x: clampNumber(location.x, 40, 920, 120 + index * 180),
        width: clampNumber(location.width, 80, 240, 150),
        theme: String(location.theme || environment.backgroundTheme || "city")
      }))
    : [];

  if (locations.length < 1) {
    throw new Error("Generated environment has no locations.");
  }

  const locationIds = new Set(locations.map((location) => location.id));

  if (locationIds.size !== locations.length) {
    throw new Error("Generated environment contains duplicate location IDs.");
  }

  const npcs = Array.isArray(environment.npcs)
    ? environment.npcs.slice(0, 4).map((npc, index) => ({
        id: worldModel.npcs.includes(npc.id) ? npc.id : "passerby",
        nameGerman: String(npc.nameGerman || npc.id || "Person"),
        role: npc.role === "quest_npc" ? "quest_npc" : "ambient_npc",
        x: clampNumber(npc.x, 50, 940, 160 + index * 180),
        nearLocationId: locationIds.has(npc.nearLocationId) ? npc.nearLocationId : locations[0].id,
        appearsAtTask: Math.round(clampNumber(npc.appearsAtTask, 1, 3, 1)),
        leavesAfterTask:
          npc.leavesAfterTask === null || npc.leavesAfterTask === undefined
            ? null
            : Math.round(clampNumber(npc.leavesAfterTask, 1, 3, 3))
      }))
    : [];

  if (npcs.length < 1 || !npcs.some((npc) => npc.role === "quest_npc")) {
    throw new Error("Generated environment needs a quest NPC.");
  }

  if (new Set(npcs.map((npc) => npc.id)).size !== npcs.length) {
    throw new Error("Generated environment contains duplicate NPC IDs.");
  }

  const items = Array.isArray(environment.items)
    ? environment.items
        .slice(0, 5)
        .filter((item) => worldModel.items.includes(item.id))
        .map((item) => ({
          id: item.id,
          nameGerman: String(item.nameGerman || item.id),
          nameSpanish: String(item.nameSpanish || item.id),
          category: String(item.category || "item")
        }))
    : [];

  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error("Generated environment contains duplicate item IDs.");
  }

  const quest = normalizeGeneratedQuest(environment.quest, {
    allowedLocations: locations.map((location) => location.id),
    allowedNpcs: npcs.map((npc) => npc.id),
    allowedLearningGoals: worldModel.learningGoals,
    allowedItems: items.map((item) => item.id)
  });

  if (!locationIds.has(quest.locationId)) {
    throw new Error("Generated quest location does not exist in environment.");
  }

  if (!npcs.some((npc) => npc.id === quest.npcId)) {
    throw new Error("Generated quest NPC does not exist in environment.");
  }

  const rewardItem = quest.successReward.item;

  if (rewardItem !== null && !items.some((item) => item.id === rewardItem)) {
    throw new Error("Generated quest reward item does not exist in environment.");
  }

  return {
    environmentId: String(environment.environmentId || `environment_${Date.now()}`),
    scenarioId: environment.scenarioId,
    titleGerman: String(environment.titleGerman || "Dynamische Alltagsszene"),
    descriptionGerman: String(environment.descriptionGerman || ""),
    backgroundTheme: String(environment.backgroundTheme || "modern_city"),
    playerStartX: clampNumber(environment.playerStartX, 20, 900, 120),
    locations,
    npcs: npcs.map((npc) => ({
      ...npc,
      role: npc.id === quest.npcId ? "quest_npc" : npc.role
    })),
    items,
    quest
  };
}

function normalizeLevel(level, scenario = null) {
  if (!level || typeof level !== "object") {
    throw new Error("Generated level is not an object.");
  }

  if (!worldModel.scenarioIds.includes(level.scenarioId)) {
    throw new Error("Generated level contains an invalid scenarioId.");
  }

  if (scenario && !scenario.allowedLocations.includes(level.scenarioId)) {
    throw new Error("Generated level contains a scenarioId outside the selected scenario.");
  }

  let vocabularyPreview = Array.isArray(level.vocabularyPreview)
    ? level.vocabularyPreview.slice(0, 7).map((entry) => ({
        de: String(entry.de || ""),
        es: String(entry.es || ""),
        exampleSpanish: String(entry.exampleSpanish || ""),
        exampleGerman: String(entry.exampleGerman || "")
      }))
    : [];

  if (vocabularyPreview.length < 4 || vocabularyPreview.length > 7) {
    throw new Error("Generated level has invalid vocabularyPreview length.");
  }

  const locations = Array.isArray(level.locations)
    ? level.locations
        .filter((location) => location.isRelevant)
        .slice(0, 4)
        .map((location, index) => ({
          id: String(location.id || `location_${index}`),
          type: worldModel.locationTypes.includes(location.type) ? location.type : "building",
          labelGerman: String(location.labelGerman || "Ort"),
          x: clampNumber(location.x, 40, 920, 120 + index * 180),
          width: clampNumber(location.width, 80, 240, 150),
          theme: String(location.theme || level.backgroundTheme || "city"),
          isRelevant: true
        }))
    : [];

  if (locations.length < 1) {
    throw new Error("Generated level has no relevant locations.");
  }

  if (scenario && scenario.allowedLocations.length > 1 && locations.length < 2) {
    throw new Error("Generated level needs at least two relevant locations.");
  }

  if (scenario && locations.some((location) => !scenario.allowedLocations.includes(location.id))) {
    throw new Error("Generated level contains a location outside the selected scenario.");
  }

  const locationIds = new Set(locations.map((location) => location.id));

  if (locationIds.size !== locations.length) {
    throw new Error("Generated level contains duplicate location IDs.");
  }

  const npcs = Array.isArray(level.npcs)
    ? level.npcs.slice(0, 4).map((npc, index) => ({
        id: worldModel.npcs.includes(npc.id) ? npc.id : "passerby",
        nameGerman: String(npc.nameGerman || npc.id || "Person"),
        role: npc.role === "quest_npc" ? "quest_npc" : "ambient_npc",
        x: clampNumber(npc.x, 50, 940, 160 + index * 180),
        nearLocationId: locationIds.has(npc.nearLocationId) ? npc.nearLocationId : locations[0].id,
        appearsAtTask: Math.round(clampNumber(npc.appearsAtTask, 1, 3, 1)),
        leavesAfterTask:
          npc.leavesAfterTask === null || npc.leavesAfterTask === undefined
            ? null
            : Math.round(clampNumber(npc.leavesAfterTask, 1, 3, 3))
      }))
    : [];

  if (npcs.length < 1 || new Set(npcs.map((npc) => npc.id)).size !== npcs.length) {
    throw new Error("Generated level contains invalid NPCs.");
  }

  if (scenario && scenario.allowedNpcs.length > 1 && npcs.length < 2) {
    throw new Error("Generated level needs at least two NPCs.");
  }

  if (scenario && npcs.some((npc) => !scenario.allowedNpcs.includes(npc.id))) {
    throw new Error("Generated level contains an NPC outside the selected scenario.");
  }

  const npcIds = new Set(npcs.map((npc) => npc.id));
  const items = Array.isArray(level.items)
    ? level.items
        .slice(0, 5)
        .filter((item) => worldModel.items.includes(item.id))
        .filter((item) => !scenario || scenario.allowedItems.includes(item.id))
        .map((item) => ({
          id: item.id,
          nameGerman: String(item.nameGerman || item.id),
          nameSpanish: String(item.nameSpanish || item.id),
          category: String(item.category || "item")
        }))
    : [];
  const itemIds = new Set(items.map((item) => item.id));

  if (itemIds.size !== items.length) {
    throw new Error("Generated level contains duplicate item IDs.");
  }

  const tasks = Array.isArray(level.tasks)
    ? level.tasks
        .slice(0, 3)
        .sort((a, b) => Number(a.order) - Number(b.order))
        .map((task, index) => {
          if (!locationIds.has(task.locationId) || !npcIds.has(task.npcId)) {
            throw new Error("Generated level task references missing location or NPC.");
          }

          if (scenario && task.learningGoal && !scenario.allowedLearningGoals.includes(task.learningGoal)) {
            throw new Error("Generated level task contains a learning goal outside the selected scenario.");
          }

          for (const itemField of ["rewardItem", "requiredItem", "removeItemOnSuccess"]) {
            if (task[itemField] !== null && task[itemField] !== undefined && !itemIds.has(task[itemField])) {
              throw new Error("Generated level task references missing item.");
            }
          }

          return {
            taskId: String(task.taskId || `task_${index + 1}`),
            order: index + 1,
            titleGerman: String(task.titleGerman || "Aufgabe"),
            instructionGerman: String(task.instructionGerman || "Antworte mit einem kurzen spanischen Satz."),
            locationId: task.locationId,
            npcId: task.npcId,
            npcName: String(task.npcName || task.npcId),
            npcSpanish: String(task.npcSpanish || "Hola."),
            expectedIntent: String(task.expectedIntent || ""),
            expectedExamples: Array.isArray(task.expectedExamples)
              ? task.expectedExamples.slice(0, 3).map((example) => String(example))
              : ["Hola."],
            requiredVocabulary: Array.isArray(task.requiredVocabulary)
              ? task.requiredVocabulary.slice(0, 5).map((word) => String(word))
              : [],
            rewardXp: Math.max(0, Math.min(Number(task.rewardXp) || 10, 20)),
            rewardItem: task.rewardItem || null,
            requiredItem: task.requiredItem || null,
            removeItemOnSuccess: task.removeItemOnSuccess || null,
            successMessageGerman: String(task.successMessageGerman || "Gut gemacht!")
          };
        })
    : [];

  if (tasks.length < 2 || tasks.length > 3) {
    throw new Error("Generated level must contain 2-3 tasks.");
  }

  const taskLocationIds = new Set(tasks.map((task) => task.locationId));
  const taskNpcIds = new Set(tasks.map((task) => task.npcId));

  if (locations.length > 1 && taskLocationIds.size < 2) {
    throw new Error("Generated level must use at least two task stations.");
  }

  if (npcs.length > 1 && taskNpcIds.size < 2) {
    throw new Error("Generated level must use at least two task NPCs.");
  }

  const totalXp = tasks.reduce((sum, task) => sum + task.rewardXp, 0);

  if (totalXp > 60) {
    throw new Error("Generated level exceeds total XP limit.");
  }

  const expectedExamples = tasks.flatMap((task) => task.expectedExamples);

  assertVisibleTextDoesNotRevealSolution("titleGerman", level.titleGerman, expectedExamples);
  assertVisibleTextDoesNotRevealSolution("descriptionGerman", level.descriptionGerman, expectedExamples);
  vocabularyPreview = sanitizeVocabularyPreview(vocabularyPreview, expectedExamples);

  for (const task of tasks) {
    assertVisibleTextDoesNotRevealSolution(`tasks.${task.taskId}.titleGerman`, task.titleGerman, task.expectedExamples);
    assertVisibleTextDoesNotRevealSolution(
      `tasks.${task.taskId}.instructionGerman`,
      task.instructionGerman,
      task.expectedExamples
    );
    assertVisibleTextDoesNotRevealSolution(`tasks.${task.taskId}.npcSpanish`, task.npcSpanish, task.expectedExamples);
    assertVisibleTextDoesNotRevealSolution(
      `tasks.${task.taskId}.successMessageGerman`,
      task.successMessageGerman,
      task.expectedExamples
    );
  }

  return {
    levelId: String(level.levelId || `level_${Date.now()}`),
    scenarioId: level.scenarioId,
    titleGerman: String(level.titleGerman || "Dynamisches Level"),
    descriptionGerman: String(level.descriptionGerman || ""),
    backgroundTheme: String(level.backgroundTheme || "modern_city"),
    playerStartX: clampNumber(level.playerStartX, 20, 900, 120),
    vocabularyPreview,
    locations,
    npcs,
    items,
    tasks,
    summaryGerman: String(level.summaryGerman || "Level abgeschlossen!")
  };
}

function normalizeGeneratedQuest(quest, scenario) {
  if (!quest || typeof quest !== "object") {
    throw new Error("Generated quest is not an object.");
  }

  if (!scenario.allowedLocations.includes(quest.locationId)) {
    throw new Error("Generated quest contains a location outside the selected scenario.");
  }

  if (!isAllowedWorldValue("npcs", quest.npcId) || !isAllowedWorldValue("learningGoals", quest.learningGoal)) {
    throw new Error("Generated quest contains IDs outside the world model.");
  }

  if (!scenario.allowedNpcs.includes(quest.npcId) || !scenario.allowedLearningGoals.includes(quest.learningGoal)) {
    throw new Error("Generated quest contains IDs outside the selected scenario.");
  }

  const rewardItem = quest.successReward && quest.successReward.item;

  if (rewardItem !== null && rewardItem !== undefined && !isAllowedWorldValue("items", rewardItem)) {
    throw new Error("Generated quest contains a reward item outside the world model.");
  }

  if (rewardItem !== null && rewardItem !== undefined && !scenario.allowedItems.includes(rewardItem)) {
    throw new Error("Generated quest contains a reward item outside the selected scenario.");
  }

  return {
    questId: String(quest.questId || `ai_quest_${Date.now()}`),
    titleGerman: String(quest.titleGerman || "Neue Alltagsquest"),
    descriptionGerman: String(quest.descriptionGerman || ""),
    locationId: quest.locationId,
    npcId: quest.npcId,
    npcName: String(quest.npcName || quest.npcId),
    learningGoal: quest.learningGoal,
    difficulty: "A1",
    npcSpanish: String(quest.npcSpanish || "Hola."),
    instructionGerman: truncateSentences(quest.instructionGerman, 2) || "Antworte passend auf Spanisch.",
    expectedIntent: String(quest.expectedIntent || ""),
    expectedExamples: Array.isArray(quest.expectedExamples)
      ? quest.expectedExamples.slice(0, 3).map((example) => String(example))
      : ["Quiero una limonada, por favor."],
    vocabulary: Array.isArray(quest.vocabulary)
      ? quest.vocabulary.slice(0, 5).map((entry) => ({
          de: String(entry.de || ""),
          es: String(entry.es || "")
        }))
      : [],
    successReward: {
      xp: Math.max(5, Math.min(Number(quest.successReward && quest.successReward.xp) || 20, 30)),
      item: rewardItem || null
    },
    summaryGerman: truncateSentences(quest.summaryGerman, 2) || "Du hast eine Alltagssituation auf Spanisch gemeistert."
  };
}

function selectScenario() {
  const randomIndex = Math.floor(Math.random() * worldModel.scenarios.length);
  return worldModel.scenarios[randomIndex];
}

function getDummyHint(questContext, hintLevel = 1) {
  const currentStep = questContext.currentStep || "buy_lemonade";

  if (currentStep === "generated_level_task" || currentStep === "generated_quest") {
    const expectedExample = Array.isArray(questContext.expectedExamples) ? questContext.expectedExamples[0] || null : null;
    const starterWordCount = Number(hintLevel) >= 2 ? 2 : 1;
    const sentenceStarter = expectedExample
      ? `${expectedExample.split(" ").slice(0, starterWordCount).join(" ")}...`
      : null;
    const canShowExample = Number(hintLevel) >= 3;

    return {
      hintLevel,
      hintGerman: "Nutze die Vokabeln aus der Vorschau und antworte mit einem kurzen Satz.",
      sentenceStarter: sentenceStarter || null,
      vocabulary: Array.isArray(questContext.vocabulary) ? questContext.vocabulary.slice(0, 5) : [],
      exampleAnswer: canShowExample ? expectedExample : null
    };
  }

  if (currentStep === "bring_to_carlos") {
    return {
      hintLevel,
      hintGerman: "Carlos fragt, ob du seine Limonade hast. Sage, dass du sie hast.",
      sentenceStarter: "Sí, tengo...",
      vocabulary: [
        { de: "ja", es: "sí" },
        { de: "ich habe", es: "tengo" },
        { de: "deine Limonade", es: "tu limonada" }
      ],
      exampleAnswer: "Sí, tengo tu limonada."
    };
  }

  return {
    hintLevel,
    hintGerman: "Du möchtest höflich sagen, dass du eine Limonade möchtest.",
    sentenceStarter: "Quiero...",
    vocabulary: [
      { de: "ich möchte", es: "quiero" },
      { de: "eine Limonade", es: "una limonada" },
      { de: "bitte", es: "por favor" }
    ],
    exampleAnswer: "Quiero una limonada, por favor."
  };
}

function buildEvaluationPrompt(userAnswer, questContext) {
  return [
    "Bewerte eine kurze spanische Antwort in einem Anfänger-Sprachlernspiel.",
    "Antworte ausschließlich mit JSON, das exakt dem Schema entspricht.",
    "feedbackGerman darf maximal 2 kurze Sätze haben.",
    "mistakes darf maximal 1-2 Einträge enthalten.",
    "",
    "hintGerman ist null bei correct und ein kurzer A1-Hinweis bei partial oder wrong.",
    "Regeln:",
    "- currentStep buy_lemonade: correct nur, wenn die Antwort ausdrückt, dass der Nutzer eine Limonade bestellen möchte.",
    "- buy_lemonade correct: xpReward 20, nextAction complete_step, inventoryReward Limonade.",
    "- buy_lemonade partial: xpReward 5, nextAction retry, inventoryReward null.",
    "- buy_lemonade wrong: xpReward 0, nextAction show_hint, inventoryReward null.",
    "- currentStep bring_to_carlos: correct nur, wenn die Antwort ausdrückt, dass der Nutzer Carlos die Limonade gibt oder hat.",
    "- bring_to_carlos correct: xpReward 25, nextAction complete_quest, inventoryReward null.",
    "- bring_to_carlos partial: xpReward 5, nextAction retry, inventoryReward null.",
    "- bring_to_carlos wrong: xpReward 0, nextAction show_hint, inventoryReward null.",
    "- currentStep generated_quest: Bewerte gegen expectedIntent und expectedExamples aus dem Quest-Kontext.",
    "- generated_quest correct: nextAction complete_quest, xpReward und inventoryReward werden serverseitig aus successReward gesetzt.",
    "- generated_quest partial: xpReward 5, nextAction retry, inventoryReward null.",
    "- generated_quest wrong: xpReward 0, nextAction show_hint, inventoryReward null.",
    "- currentStep generated_level_task: Bewerte gegen expectedIntent, expectedExamples, npcSpanish, instructionGerman und requiredVocabulary.",
    "- generated_level_task correct: Die Absicht passt zur aktuellen Aufgabe, auch wenn die Antwort nicht exakt einem Beispiel entspricht.",
    "- generated_level_task: Gib xpReward 0 und inventoryReward null zurück; Belohnungen werden separat aus dem aktiven Task begrenzt.",
    "- Bei falschen Antworten gib kurze A1-Hilfe.",
    "",
    `Quest-Kontext: ${JSON.stringify(questContext)}`,
    `Nutzerantwort: ${userAnswer}`
  ].join("\n");
}

function buildHintPrompt(questContext, lastUserAnswer, hintLevel) {
  return [
    "Erzeuge eine kurze Hilfestellung für ein Spanisch-Anfänger-Spiel.",
    "Antworte ausschließlich mit JSON, das exakt dem Schema entspricht.",
    "hintGerman soll kurz, freundlich und auf Deutsch sein.",
    "Gib keine XP, keine Items und keine Queständerungen aus.",
    "Zeige keine vollständige Beispielantwort bei hintLevel 1 oder 2; exampleAnswer muss dann null sein.",
    "Bei hintLevel 1-2 sind nur Vokabeln, kurze Hinweise und ein Satzanfang erlaubt.",
    "Erst ab hintLevel 3 darf exampleAnswer eine vollständige Beispielantwort enthalten.",
    "",
    "Kontextregeln:",
    "- currentStep buy_lemonade: Hilf dem Nutzer, höflich eine Limonade zu bestellen.",
    "- currentStep bring_to_carlos: Hilf dem Nutzer, Carlos zu sagen, dass er seine Limonade hat oder sie ihm gibt.",
    "- Je höher hintLevel ist, desto konkreter darf die Hilfe werden.",
    "",
    `Quest-Kontext: ${JSON.stringify(questContext)}`,
    `Letzte Nutzerantwort: ${lastUserAnswer || ""}`,
    `Hint-Level: ${hintLevel}`
  ].join("\n");
}

function buildQuestPrompt(scenario) {
  return [
    "Du bist der AI Game Director für ein A1-Spanisch-Lernspiel.",
    "Erzeuge genau eine konkrete, kurze Alltagsquest.",
    "Antworte ausschließlich mit JSON, das exakt dem Schema entspricht.",
    "Nutze nur IDs aus dem angegebenen Szenario. Erfinde keine neuen locationId, npcId, learningGoal oder Items.",
    "Die Quest muss für Spanisch-Anfänger auf Niveau A1 lösbar sein.",
    "expectedExamples sollen kurze spanische Beispielantworten enthalten.",
    "successReward.xp muss zwischen 10 und 30 liegen.",
    "",
    `Erlaubtes Szenario: ${JSON.stringify(scenario)}`,
    `Globales World Model: ${JSON.stringify(worldModel)}`
  ].join("\n");
}

function buildEnvironmentPrompt() {
  return [
    "Du bist der AI Game Director für Spanish Street Quest.",
    "Erzeuge genau eine vollständige A1-Spielumgebung mit Orten, NPCs, Items und einer passenden Quest.",
    "Antworte ausschließlich mit JSON, das exakt dem Schema entspricht.",
    "Nutze nur erlaubte scenarioIds, location types, NPC IDs, learningGoals und Items aus dem World Model.",
    "locations müssen konkrete Szenenobjekte sein. quest.locationId muss exakt eine id aus locations sein.",
    "quest.npcId muss exakt eine id aus npcs sein. Genau dieser NPC soll role quest_npc haben.",
    "successReward.item muss null sein oder exakt eine id aus items sein.",
    "Jeder NPC muss appearsAtTask und leavesAfterTask enthalten. Fuer dauerhaft sichtbare NPCs nutze appearsAtTask 1 und leavesAfterTask null.",
    "x-Positionen sollen im Bereich 40 bis 920 liegen. playerStartX im Bereich 20 bis 900.",
    "Die Szene soll eine andere Alltagssituation als die Fallback-Limonadenquest sein, wenn möglich.",
    "Die Quest muss kurz, konkret und auf A1-Niveau lösbar sein.",
    "",
    `World Model: ${JSON.stringify({
      scenarioIds: worldModel.scenarioIds,
      locationTypes: worldModel.locationTypes,
      npcs: worldModel.npcs,
      learningGoals: worldModel.learningGoals,
      items: worldModel.items
    })}`
  ].join("\n");
}

function buildLevelPrompt(scenario) {
  const allowedScenarioIds = scenario.allowedLocations.filter((location) => worldModel.scenarioIds.includes(location));
  const allowedWorldFrame = {
    scenarioFrameId: scenario.id,
    scenarioIds: allowedScenarioIds,
    locationIds: scenario.allowedLocations,
    locationTypes: worldModel.locationTypes,
    npcs: scenario.allowedNpcs,
    learningGoals: scenario.allowedLearningGoals,
    items: scenario.allowedItems
  };

  return [
    "Du bist der AI Game Director und Sprachdidaktiker für Spanish Street Quest.",
    "Erzeuge genau ein Level für absolute Spanisch-Anfänger auf Niveau A1.",
    "Antworte ausschließlich mit JSON, das exakt dem Schema entspricht.",
    "Nutze ausschließlich IDs aus dem angegebenen erlaubten Szenario-Rahmen.",
    "level.scenarioId muss aus scenarioIds im erlaubten Szenario-Rahmen stammen.",
    "locations[].id muss aus locationIds im erlaubten Szenario-Rahmen stammen.",
    "npcs[].id muss aus npcs im erlaubten Szenario-Rahmen stammen.",
    "items[].id muss aus items im erlaubten Szenario-Rahmen stammen.",
    "Nimm in items nur Dinge auf, die in tasks als rewardItem, requiredItem oder removeItemOnSuccess gebraucht werden.",
    "Bevorzuge abwechslungsreiche Alltagsziele aus learningGoals. Nutze order_drink nur, wenn es wirklich zum Szenario passt.",
    "Das Level besteht aus einer einfachen Umgebung, einer Vokabel-Vorschau und 2-3 kurzen Aufgaben.",
    "Jedes Level muss eine kleine Handlungskette haben: gehe zu Station A, bekomme oder kaufe etwas, gehe zu Station B, nutze oder gib es weiter.",
    "Nutze bei 2-3 Aufgaben mindestens zwei verschiedene task.locationId und mindestens zwei verschiedene task.npcId.",
    "Vermeide Levels, in denen der Spieler mehrfach am selben Ort mit derselben Person interagiert.",
    "Wenn es sinnvoll ist, soll mindestens eine Aufgabe ein rewardItem geben und eine spätere Aufgabe dieses Item als requiredItem oder removeItemOnSuccess nutzen.",
    "NPCs dürfen während des Levels erscheinen oder verschwinden: appearsAtTask und leavesAfterTask sind für jeden NPC Pflichtfelder.",
    "Fuer dauerhaft sichtbare NPCs nutze appearsAtTask 1 und leavesAfterTask null.",
    "Der aktive NPC einer Aufgabe muss bei dieser Aufgabe sichtbar sein.",
    "Jede Aufgabe darf nur einen kurzen spanischen Satz erfordern.",
    "Keine langen Dialoge. Keine schweren Textaufgaben. Keine Grammatik-Erklärungen in der Aufgabe.",
    "Nutze pro Level 4-7 Vokabeln in vocabularyPreview.",
    "Alle expectedExamples müssen sehr kurz und realistisch sein.",
    "Jede Aufgabe darf nur Vokabeln aus vocabularyPreview oder sehr einfache bekannte Wörter nutzen.",
    "Sichtbare Felder dürfen keine vollständigen Lösungen oder Beispielantworten enthalten.",
    "Halte titleGerman, descriptionGerman, instructionGerman, npcSpanish und successMessageGerman frei von expectedExamples.",
    "instructionGerman beschreibt nur die Aufgabe, z. B. 'Bestelle ein Getränk.' oder 'Frage nach dem Preis.'.",
    "npcSpanish ist eine natürliche NPC-Frage oder Aufforderung und enthält nicht die Antwort.",
    "Verwende in sichtbaren Feldern nie Formulierungen wie 'Sage:', 'Schreibe:', 'Antworte mit:', 'Benutze den Satz', 'Di:', 'La respuesta correcta' oder 'Debes decir'.",
    "Lege die Lösung nur intern in expectedIntent, expectedExamples und requiredVocabulary ab.",
    "vocabularyPreview.exampleSpanish darf nicht exakt dieselbe vollständige Lösung wie ein expectedExample sein.",
    "Rendere nur relevante Locations. Maximal ein dekoratives Element, aber besser keine irrelevanten Gebäude.",
    "task.locationId muss exakt eine id aus locations sein.",
    "task.npcId muss exakt eine id aus npcs sein.",
    "rewardItem, requiredItem und removeItemOnSuccess müssen null oder eine id aus items sein.",
    "rewardXp pro Task maximal 20, insgesamt maximal 60.",
    "x-Positionen sollen im Bereich 40 bis 920 liegen.",
    "",
    `Erlaubter Szenario-Rahmen: ${JSON.stringify(allowedWorldFrame)}`
  ].join("\n");
}

function extractOutputText(responseData) {
  if (typeof responseData.output_text === "string") {
    return responseData.output_text;
  }

  for (const outputItem of responseData.output || []) {
    for (const contentItem of outputItem.content || []) {
      if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
        return contentItem.text;
      }
    }
  }

  return "";
}

function getSchemaTypes(schema) {
  return Array.isArray(schema.type) ? schema.type : [schema.type];
}

function validateStructuredOutput(value, schema, pathLabel = "output") {
  if (!schema || typeof schema !== "object") {
    return;
  }

  const schemaTypes = getSchemaTypes(schema).filter(Boolean);

  if (schemaTypes.length > 0) {
    const matchesType = schemaTypes.some((type) => {
      if (type === "array") {
        return Array.isArray(value);
      }

      if (type === "null") {
        return value === null;
      }

      if (type === "object") {
        return value !== null && typeof value === "object" && !Array.isArray(value);
      }

      return typeof value === type;
    });

    if (!matchesType) {
      throw new Error(`Structured output validation failed at ${pathLabel}: expected ${schemaTypes.join(" or ")}.`);
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    throw new Error(`Structured output validation failed at ${pathLabel}: value is outside enum.`);
  }

  if (schema.type === "object" || schemaTypes.includes("object")) {
    const properties = schema.properties || {};
    const required = schema.required || [];

    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        throw new Error(`Structured output validation failed at ${pathLabel}.${key}: missing required field.`);
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          throw new Error(`Structured output validation failed at ${pathLabel}.${key}: unknown field.`);
        }
      }
    }

    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        validateStructuredOutput(value[key], childSchema, `${pathLabel}.${key}`);
      }
    }
  }

  if (schema.type === "array" || schemaTypes.includes("array")) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      throw new Error(`Structured output validation failed at ${pathLabel}: too few items.`);
    }

    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
      throw new Error(`Structured output validation failed at ${pathLabel}: too many items.`);
    }

    if (schema.items) {
      value.forEach((entry, index) => validateStructuredOutput(entry, schema.items, `${pathLabel}[${index}]`));
    }
  }
}

function parseStructuredOutput(outputText, schema, outputName) {
  const parsedOutput = JSON.parse(outputText);
  validateStructuredOutput(parsedOutput, schema, outputName);
  return parsedOutput;
}

function truncateSentences(text, maxSentences = 2) {
  const normalizedText = String(text || "").trim();
  const sentences = normalizedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];

  return sentences.slice(0, maxSentences).join(" ").trim();
}

function normalizeEvaluation(evaluation, questContext) {
  const currentStep = questContext.currentStep || "buy_lemonade";
  const allowedResults = new Set(["correct", "partial", "wrong"]);
  const result = allowedResults.has(evaluation.result) ? evaluation.result : "wrong";
  const isCorrect = result === "correct";

  let xpReward = 0;
  let nextAction = "show_hint";
  let inventoryReward = null;
  let correctedSpanish = currentStep === "bring_to_carlos" ? "Sí, tengo tu limonada." : "Quiero una limonada, por favor.";

  if (currentStep === "generated_level_task") {
    correctedSpanish = Array.isArray(questContext.expectedExamples)
      ? questContext.expectedExamples[0] || correctedSpanish
      : correctedSpanish;

    if (result === "correct") {
      nextAction = "complete_quest";
    } else if (result === "partial") {
      nextAction = "retry";
    }
  } else if (currentStep === "generated_quest") {
    correctedSpanish = Array.isArray(questContext.expectedExamples)
      ? questContext.expectedExamples[0] || correctedSpanish
      : correctedSpanish;

    if (result === "correct") {
      const safeReward = getSafeGeneratedReward(questContext);
      xpReward = safeReward.xp;
      nextAction = "complete_quest";
      inventoryReward = safeReward.item;
    } else if (result === "partial") {
      xpReward = 5;
      nextAction = "retry";
    }
  } else if (currentStep === "bring_to_carlos") {
    if (result === "correct") {
      xpReward = 25;
      nextAction = "complete_quest";
    } else if (result === "partial") {
      xpReward = 5;
      nextAction = "retry";
    }
  } else if (result === "correct") {
    xpReward = 20;
    nextAction = "complete_step";
    inventoryReward = "Limonade";
  } else if (result === "partial") {
    xpReward = 5;
    nextAction = "retry";
  }

  const mistakes = Array.isArray(evaluation.mistakes)
    ? evaluation.mistakes.slice(0, 2).map((mistake) => ({
        type: String(mistake.type || "unknown"),
        explanationGerman: String(mistake.explanationGerman || "")
      }))
    : [];

  return {
    result,
    isCorrect,
    intentMatched: Boolean(evaluation.intentMatched),
    feedbackGerman: truncateSentences(evaluation.feedbackGerman) || "Bewertung abgeschlossen.",
    correctedSpanish: String(evaluation.correctedSpanish || correctedSpanish),
    hintGerman:
      typeof evaluation.hintGerman === "string" && evaluation.hintGerman.trim()
        ? truncateSentences(evaluation.hintGerman, 1)
        : null,
    xpReward,
    nextAction,
    inventoryReward,
    mistakes
  };
}

function limitSentenceStarter(sentenceStarter, hintLevel) {
  if (typeof sentenceStarter !== "string" || !sentenceStarter.trim()) {
    return null;
  }

  if (Number(hintLevel) >= 3) {
    return sentenceStarter;
  }

  const words = sentenceStarter.replace(/\.+$/g, "").trim().split(/\s+/);
  const wordLimit = Number(hintLevel) >= 2 ? 2 : 1;
  return `${words.slice(0, wordLimit).join(" ")}...`;
}

function normalizeHint(hint, questContext, hintLevel) {
  const fallbackHint = getDummyHint(questContext, hintLevel);
  const safeHintLevel = Number(hint.hintLevel || hintLevel);
  const canShowExample = safeHintLevel >= 3;
  const candidateSentenceStarter =
    typeof hint.sentenceStarter === "string" || hint.sentenceStarter === null
      ? hint.sentenceStarter
      : fallbackHint.sentenceStarter;
  const vocabulary = Array.isArray(hint.vocabulary)
    ? hint.vocabulary.slice(0, 5).map((entry) => ({
        de: String(entry.de || ""),
        es: String(entry.es || "")
      }))
    : fallbackHint.vocabulary;

  return {
    hintLevel: safeHintLevel,
    hintGerman: truncateSentences(hint.hintGerman, 2) || fallbackHint.hintGerman,
    sentenceStarter: limitSentenceStarter(candidateSentenceStarter, safeHintLevel),
    vocabulary,
    exampleAnswer: canShowExample
      ? typeof hint.exampleAnswer === "string" || hint.exampleAnswer === null
        ? hint.exampleAnswer
        : fallbackHint.exampleAnswer
      : null
  };
}

async function evaluateWithOpenAI(userAnswer, questContext) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: buildEvaluationPrompt(userAnswer, questContext),
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name: "spanish_street_quest_evaluation",
            strict: true,
            schema: evaluationSchema
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const responseData = await response.json();
    const outputText = extractOutputText(responseData);
    const parsedEvaluation = parseStructuredOutput(outputText, evaluationSchema, "evaluation");

    return normalizeEvaluation(parsedEvaluation, questContext);
  } finally {
    clearTimeout(timeout);
  }
}

async function generateHintWithOpenAI(questContext, lastUserAnswer, hintLevel) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: buildHintPrompt(questContext, lastUserAnswer, hintLevel),
        max_output_tokens: 250,
        text: {
          format: {
            type: "json_schema",
            name: "spanish_street_quest_hint",
            strict: true,
            schema: hintSchema
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const responseData = await response.json();
    const outputText = extractOutputText(responseData);
    const parsedHint = parseStructuredOutput(outputText, hintSchema, "hint");

    return normalizeHint(parsedHint, questContext, hintLevel);
  } finally {
    clearTimeout(timeout);
  }
}

async function generateQuestWithOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const scenario = selectScenario();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: buildQuestPrompt(scenario),
        max_output_tokens: 500,
        text: {
          format: {
            type: "json_schema",
            name: "spanish_street_quest_director_quest",
            strict: true,
            schema: questSchema
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const responseData = await response.json();
    const outputText = extractOutputText(responseData);
    const parsedQuest = parseStructuredOutput(outputText, questSchema, "quest");

    return normalizeGeneratedQuest(parsedQuest, scenario);
  } finally {
    clearTimeout(timeout);
  }
}

async function generateEnvironmentWithOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: buildEnvironmentPrompt(),
        max_output_tokens: 700,
        text: {
          format: {
            type: "json_schema",
            name: "spanish_street_quest_environment",
            strict: true,
            schema: environmentSchema
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const responseData = await response.json();
    const outputText = extractOutputText(responseData);
    const parsedEnvironment = parseStructuredOutput(outputText, environmentSchema, "environment");

    return normalizeEnvironment(parsedEnvironment);
  } finally {
    clearTimeout(timeout);
  }
}

async function generateLevelWithOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const scenario = selectScenario();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: buildLevelPrompt(scenario),
        text: {
          format: {
            type: "json_schema",
            name: "spanish_street_quest_level",
            strict: true,
            schema: levelSchema
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const responseData = await response.json();
    const outputText = extractOutputText(responseData);
    const parsedLevel = parseStructuredOutput(outputText, levelSchema, "level");

    return normalizeLevel(parsedLevel, scenario);
  } finally {
    clearTimeout(timeout);
  }
}

async function generateItemImageWithOpenAI(item, taskContext = {}) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const safeItem = getSafeItem(item);
  const cacheKey = [
    OPENAI_IMAGE_MODEL,
    safeItem.id,
    safeItem.nameGerman,
    safeItem.nameSpanish,
    safeItem.category
  ].join(":");

  if (itemImageCache.has(cacheKey)) {
    return {
      itemId: safeItem.id,
      imageDataUrl: itemImageCache.get(cacheKey),
      source: "openai_cache"
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(OPENAI_IMAGES_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt: buildItemImagePrompt(safeItem, taskContext),
        size: "1024x1024",
        quality: "low",
        output_format: "png",
        n: 1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI image API error: ${response.status}`);
    }

    const responseData = await response.json();
    const imageBase64 = responseData.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new Error("OpenAI image response did not contain base64 image data.");
    }

    const imageDataUrl = `data:image/png;base64,${imageBase64}`;
    itemImageCache.set(cacheKey, imageDataUrl);

    return {
      itemId: safeItem.id,
      imageDataUrl,
      source: "openai"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateItemChoicesWithOpenAI(expectedItem, taskContext = {}, availableItems = []) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: buildItemChoicesPrompt(expectedItem, taskContext, availableItems),
        max_output_tokens: 350,
        text: {
          format: {
            type: "json_schema",
            name: "spanish_street_quest_item_choices",
            strict: true,
            schema: itemChoiceSchema
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI item choice API error: ${response.status}`);
    }

    const responseData = await response.json();
    const outputText = extractOutputText(responseData);
    const parsedChoices = parseStructuredOutput(outputText, itemChoiceSchema, "itemChoices");

    return normalizeItemChoices(parsedChoices, expectedItem);
  } finally {
    clearTimeout(timeout);
  }
}

app.post("/api/evaluate-answer", async (req, res) => {
  const { userAnswer = "", questContext = {} } = req.body || {};
  const safeQuestContext = getSafeQuestContext(questContext);
  const currentStep = safeQuestContext.currentStep || "buy_lemonade";
  const normalizedAnswer = normalizeAnswer(userAnswer);
  const normalizedQuestContext = {
    ...safeQuestContext,
    currentStep
  };

  if (safeQuestContext.questStatus === "completed" || currentStep === "completed") {
    return res.json(normalizeEvaluation(getCompletedQuestEvaluation(), normalizedQuestContext));
  }

  if (!normalizedAnswer) {
    return res.json(normalizeEvaluation(getDummyEvaluation(normalizedAnswer, normalizedQuestContext), normalizedQuestContext));
  }

  try {
    const aiEvaluation = await evaluateWithOpenAI(userAnswer, normalizedQuestContext);

    if (aiEvaluation) {
      return res.json(aiEvaluation);
    }
  } catch (error) {
    console.error("OpenAI evaluation failed, using dummy fallback:", error.message);
  }

  return res.json(normalizeEvaluation(getDummyEvaluation(normalizedAnswer, normalizedQuestContext), normalizedQuestContext));
});

app.post("/api/generate-hint", async (req, res) => {
  const { questContext = {}, lastUserAnswer = null, hintLevel = 1 } = req.body || {};
  const safeQuestContext = getSafeQuestContext(questContext);
  const currentStep = safeQuestContext.currentStep || "buy_lemonade";
  const normalizedQuestContext = {
    ...safeQuestContext,
    currentStep
  };
  const safeHintLevel = Math.max(1, Math.min(Number(hintLevel) || 1, 3));

  if (safeQuestContext.questStatus === "completed" || currentStep === "completed") {
    return res.json(getDummyHint(normalizedQuestContext, safeHintLevel));
  }

  try {
    const aiHint = await generateHintWithOpenAI(normalizedQuestContext, lastUserAnswer, safeHintLevel);

    if (aiHint) {
      return res.json(aiHint);
    }
  } catch (error) {
    console.error("OpenAI hint generation failed, using dummy fallback:", error.message);
  }

  return res.json(getDummyHint(normalizedQuestContext, safeHintLevel));
});

app.post("/api/generate-item-choices", async (req, res) => {
  const { taskContext = {}, expectedItem = null, availableItems = [] } = req.body || {};
  const safeTaskContext = getSafeQuestContext(taskContext);
  const safeExpectedItem = getExpectedItemFromRequest(expectedItem, safeTaskContext);

  try {
    const generatedChoices = await generateItemChoicesWithOpenAI(safeExpectedItem, safeTaskContext, availableItems);

    if (generatedChoices) {
      return res.json(generatedChoices);
    }
  } catch (error) {
    console.error("OpenAI item choice generation failed, using fallback choices:", error.message);
  }

  return res.json(getDummyItemChoices(safeExpectedItem));
});

app.post("/api/generate-item-image", async (req, res) => {
  const { item = {}, taskContext = {} } = req.body || {};
  const safeItem = getSafeItem(item);

  try {
    const generatedImage = await generateItemImageWithOpenAI(safeItem, getSafeQuestContext(taskContext));

    if (generatedImage) {
      return res.json(generatedImage);
    }
  } catch (error) {
    console.error("OpenAI item image generation failed, using fallback image:", error.message);
  }

  return res.json({
    itemId: safeItem.id,
    imageDataUrl: getFallbackItemImage(safeItem),
    source: process.env.OPENAI_API_KEY ? "fallback" : "fallback_no_key"
  });
});

app.post("/api/generate-quest", async (req, res) => {
  try {
    const generatedQuest = await generateQuestWithOpenAI();

    if (generatedQuest) {
      return res.json(generatedQuest);
    }
  } catch (error) {
    console.error("OpenAI quest generation failed, using fallback quest:", error.message);
  }

  return res.json(getFallbackGeneratedQuest());
});

app.post("/api/generate-environment", async (req, res) => {
  try {
    const generatedEnvironment = await generateEnvironmentWithOpenAI();

    if (generatedEnvironment) {
      return res.json(generatedEnvironment);
    }
  } catch (error) {
    console.error("OpenAI environment generation failed, using fallback environment:", error.message);
  }

  return res.json(getFallbackEnvironment());
});

app.post("/api/generate-level", async (req, res) => {
  try {
    const generatedLevel = await generateLevelWithOpenAI();

    if (generatedLevel) {
      return res.json(generatedLevel);
    }
  } catch (error) {
    console.error("OpenAI level generation failed, using fallback level:", error.message);
  }

  return res.json(getFallbackLevel());
});

app.listen(PORT, () => {
  console.log(`Spanish Street Quest server running at http://localhost:${PORT}`);
});
