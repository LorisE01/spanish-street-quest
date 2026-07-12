require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const configuredBuildingAssets = require("./public/buildingAssets");
const configuredCharacterAssets = require("./public/characterAssets");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-nano";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_IMAGES_API_URL = "https://api.openai.com/v1/images/generations";
const USE_GENERATION_FALLBACKS = process.env.USE_GENERATION_FALLBACKS === "true";
const MAX_LEVEL_GENERATION_ATTEMPTS = 3;
const itemImageCache = new Map();
const availableBuildingAssets = Object.fromEntries(
  Object.entries(configuredBuildingAssets).filter(([locationId, asset]) => {
    const relativeAssetPath = String(asset.src || "").replace(/^[/\\]+/, "");
    const assetExists = fs.existsSync(path.join(__dirname, "public", relativeAssetPath));

    if (!assetExists) {
      console.warn(`Building asset ${locationId} was ignored because ${asset.src} does not exist.`);
    }

    return assetExists;
  })
);
const availableBuildingLocationIds = Object.freeze(Object.keys(availableBuildingAssets));
const availableBuildingLocationIdSet = new Set(availableBuildingLocationIds);
const availableCharacterAssets = Object.fromEntries(
  Object.entries(configuredCharacterAssets).filter(([npcId, asset]) => {
    const portraitPath = String(asset.portrait || "").replace(/^[/\\]+/, "");
    const spritePath = String(asset.sprite || "").replace(/^[/\\]+/, "");
    const pairExists =
      fs.existsSync(path.join(__dirname, "public", portraitPath)) &&
      fs.existsSync(path.join(__dirname, "public", spritePath));

    if (!pairExists) {
      console.warn(`Character asset ${npcId} was ignored because its portrait or idle sprite is missing.`);
    }

    return pairExists;
  })
);
const availableNpcIds = Object.freeze(Object.keys(availableCharacterAssets));
const availableNpcIdSet = new Set(availableNpcIds);

if (availableBuildingLocationIds.length === 0) {
  throw new Error("No usable PNG building assets were found in public/assets/buildings.");
}

if (availableNpcIds.length === 0) {
  throw new Error("No complete NPC portrait and idle pairs were found in public/assets/characters.");
}

function onlyAvailableBuildingLocations(locationIds) {
  return locationIds.filter((locationId) => availableBuildingLocationIdSet.has(locationId));
}

function onlyAvailableNpcs(npcIds) {
  return npcIds.filter((npcId) => availableNpcIdSet.has(npcId));
}

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
      type: "null"
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
  locations: availableBuildingLocationIds,
  npcs: availableNpcIds,
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
      id: "street",
      scenarioId: "street",
      allowedLocations: onlyAvailableBuildingLocations(["park", "bus_stop", "drink_stand"]),
      allowedNpcs: onlyAvailableNpcs(["passerby", "carlos", "bus_driver", "tourist"]),
      allowedLearningGoals: ["introduce_yourself", "ask_directions", "ask_for_help", "greeting", "give_item"],
      allowedItems: ["agua", "billete", "tarjeta"]
    },
    {
      id: "supermarket",
      scenarioId: "supermarket",
      allowedLocations: onlyAvailableBuildingLocations(["supermarket", "park", "drink_stand"]),
      allowedNpcs: onlyAvailableNpcs(["cashier", "shop_assistant", "passerby", "carlos", "tourist"]),
      allowedLearningGoals: ["buy_food", "ask_price", "ask_for_help", "greeting", "give_item"],
      allowedItems: ["pan", "manzana", "dinero", "tarjeta", "ensalada", "queso", "bocadillo", "platano"]
    },
    {
      id: "cafe",
      scenarioId: "cafe",
      allowedLocations: onlyAvailableBuildingLocations(["cafe", "park", "supermarket"]),
      allowedNpcs: onlyAvailableNpcs(["barista", "passerby", "carlos", "tourist"]),
      allowedLearningGoals: ["order_food", "order_drink", "ask_price", "greeting", "give_item"],
      allowedItems: ["cafe", "agua", "bocadillo", "dinero", "tarjeta"]
    },
    {
      id: "restaurant",
      scenarioId: "restaurant",
      allowedLocations: onlyAvailableBuildingLocations(["restaurant", "park", "cafe"]),
      allowedNpcs: onlyAvailableNpcs(["waiter", "passerby", "carlos", "tourist"]),
      allowedLearningGoals: ["order_food", "order_drink", "ask_price", "greeting", "give_item"],
      allowedItems: ["ensalada", "queso", "bocadillo", "agua", "cafe", "dinero", "tarjeta"]
    },
    {
      id: "park",
      scenarioId: "park",
      allowedLocations: onlyAvailableBuildingLocations(["park", "drink_stand", "bus_stop"]),
      allowedNpcs: onlyAvailableNpcs(["carlos", "passerby", "vendor", "park_guard", "tourist"]),
      allowedLearningGoals: ["introduce_yourself", "greeting", "ask_directions", "ask_for_help", "give_item"],
      allowedItems: ["agua", "limonada", "manzana", "bocadillo"]
    },
    {
      id: "bus_stop",
      scenarioId: "bus_stop",
      allowedLocations: onlyAvailableBuildingLocations(["bus_stop", "hotel", "park"]),
      allowedNpcs: onlyAvailableNpcs(["bus_driver", "passerby", "receptionist", "tourist"]),
      allowedLearningGoals: ["ask_directions", "ask_for_help", "greeting", "give_item"],
      allowedItems: ["billete", "tarjeta", "llave"]
    },
    {
      id: "hotel",
      scenarioId: "hotel",
      allowedLocations: onlyAvailableBuildingLocations(["hotel", "bus_stop", "cafe"]),
      allowedNpcs: onlyAvailableNpcs(["receptionist", "passerby", "bus_driver", "tourist"]),
      allowedLearningGoals: ["introduce_yourself", "ask_directions", "check_in_hotel", "ask_for_help", "greeting"],
      allowedItems: ["llave", "tarjeta", "billete"]
    },
    {
      id: "clothing_store",
      scenarioId: "clothing_store",
      allowedLocations: onlyAvailableBuildingLocations(["clothing_store", "park", "cafe"]),
      allowedNpcs: onlyAvailableNpcs(["shop_assistant", "passerby", "carlos", "tourist"]),
      allowedLearningGoals: ["ask_price", "ask_for_help", "greeting", "give_item"],
      allowedItems: ["camiseta", "zapatos", "chaqueta", "dinero", "tarjeta"]
    },
    {
      id: "post_office",
      scenarioId: "post_office",
      allowedLocations: onlyAvailableBuildingLocations(["post_office", "park", "bus_stop"]),
      allowedNpcs: onlyAvailableNpcs(["postal_worker", "passerby", "carlos", "tourist"]),
      allowedLearningGoals: ["ask_price", "ask_for_help", "greeting", "give_item"],
      allowedItems: ["sello", "postal", "dinero", "tarjeta"]
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
            type: "string",
            enum: worldModel.locations
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
    "taskType",
    "wordOrder",
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
    taskType: {
      type: "string",
      enum: ["free_text", "word_order"]
    },
    wordOrder: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["tiles", "correctOrder"],
      properties: {
        tiles: {
          type: "array",
          minItems: 2,
          maxItems: 10,
          items: { type: "string" }
        },
        correctOrder: {
          type: "array",
          minItems: 2,
          maxItems: 10,
          items: { type: "string" }
        }
      }
    },
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
    items: {
      ...environmentSchema.properties.items,
      minItems: 0
    },
    tasks: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: levelTaskSchema
    },
    summaryGerman: { type: "string" }
  }
};

function createLevelSchemaForScenario(scenario) {
  const schema = JSON.parse(JSON.stringify(levelSchema));
  const taskProperties = schema.properties.tasks.items.properties;

  schema.properties.scenarioId.enum = [scenario.scenarioId];
  schema.properties.locations.items.properties.id.enum = scenario.allowedLocations;
  schema.properties.npcs.items.properties.id.enum = scenario.allowedNpcs;
  schema.properties.items.items.properties.id.enum = scenario.allowedItems;
  taskProperties.locationId.enum = scenario.allowedLocations;
  taskProperties.npcId.enum = scenario.allowedNpcs;

  for (const itemField of ["rewardItem", "requiredItem", "removeItemOnSuccess"]) {
    taskProperties[itemField].enum = [...scenario.allowedItems, null];
  }

  return schema;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Spanish Street Quest server läuft."
  });
});

function sendGenerationUnavailable(res, type, message = "KI-Generierung konnte nicht abgeschlossen werden.") {
  return res.status(503).json({
    error: "generation_unavailable",
    type,
    message
  });
}

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

function evaluateWordOrderTask(normalizedAnswer, questContext) {
  const expectedExamples = Array.isArray(questContext.expectedExamples) ? questContext.expectedExamples : [];
  const normalizedExamples = expectedExamples.map(normalizeAnswer).filter(Boolean);
  const correctedSpanish = String(expectedExamples[0] || "");

  if (normalizedExamples.includes(normalizedAnswer)) {
    return {
      result: "correct",
      isCorrect: true,
      intentMatched: true,
      feedbackGerman: "Sehr gut! Die Wörter stehen in der richtigen Reihenfolge.",
      correctedSpanish,
      xpReward: 0,
      nextAction: "complete_quest",
      inventoryReward: null,
      mistakes: []
    };
  }

  const answerTokens = normalizedAnswer.split(/\s+/).filter(Boolean);
  const expectedTokens = normalizeAnswer(expectedExamples[0]).split(/\s+/).filter(Boolean);

  if (haveSameWordTileMultiset(answerTokens, expectedTokens)) {
    return {
      result: "partial",
      isCorrect: false,
      intentMatched: true,
      feedbackGerman: "Fast richtig! Alle Wörter sind da, aber die Reihenfolge stimmt noch nicht.",
      correctedSpanish,
      xpReward: 0,
      nextAction: "retry",
      inventoryReward: null,
      mistakes: [
        {
          type: "word_order",
          explanationGerman: "Ordne die Wörter zu einem natürlichen spanischen Satz."
        }
      ]
    };
  }

  return {
    result: "wrong",
    isCorrect: false,
    intentMatched: false,
    feedbackGerman: "Nutze alle Wortkärtchen und ordne sie zu einem vollständigen Satz.",
    correctedSpanish,
    xpReward: 0,
    nextAction: "show_hint",
    inventoryReward: null,
    mistakes: [
      {
        type: "word_order",
        explanationGerman: "Der gebildete Satz enthält noch nicht alle benötigten Wörter."
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

function sanitizeVisibleText(fieldName, value, expectedExamples, fallbackText) {
  const candidate = String(value || fallbackText);

  try {
    assertVisibleTextDoesNotRevealSolution(fieldName, candidate, expectedExamples);
    return candidate;
  } catch (error) {
    console.warn(`Sanitized generated level text in ${fieldName}:`, error.message);
    return fallbackText;
  }
}

function getSafeTaskInstruction(task) {
  const intent = normalizeForSolutionLeakCheck(task.expectedIntent);

  if (intent.includes("preis") || intent.includes("cuanto") || intent.includes("cuesta")) {
    return "Frage nach dem Preis.";
  }

  if (intent.includes("weg") || intent.includes("richtung") || intent.includes("finden")) {
    return "Frage nach dem Weg.";
  }

  if (intent.includes("hotel") || intent.includes("eincheck")) {
    return "Melde dich im Hotel an.";
  }

  if (intent.includes("vorstell") || intent.includes("name")) {
    return "Stelle dich kurz vor.";
  }

  if (intent.includes("begru") || intent.includes("hallo")) {
    return "Begrüße die Person.";
  }

  if (intent.includes("hilfe") || intent.includes("helfen")) {
    return "Bitte um Hilfe.";
  }

  if (intent.includes("gib") || intent.includes("ueberg") || intent.includes("bring")) {
    return "Überreiche den passenden Gegenstand.";
  }

  if (intent.includes("kauf")) {
    return "Kaufe den passenden Gegenstand.";
  }

  if (intent.includes("bestell")) {
    return "Bestelle etwas Passendes.";
  }

  return "Reagiere mit einem kurzen spanischen Satz.";
}

function getSafeNpcLine(task) {
  const intent = normalizeForSolutionLeakCheck(task.expectedIntent);

  if (intent.includes("vorstell") || intent.includes("name")) {
    return "Hola, ¿cómo te llamas?";
  }

  if (intent.includes("gib") || intent.includes("ueberg") || intent.includes("bring")) {
    return "Hola, ¿tienes algo para mí?";
  }

  if (intent.includes("bestell") || intent.includes("kauf")) {
    return "Hola, ¿qué deseas?";
  }

  return "Hola, ¿en qué puedo ayudarte?";
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

  if (locations.some((location) => !availableBuildingLocationIdSet.has(location.id))) {
    throw new Error("Generated environment references a location without a PNG building asset.");
  }

  const locationIds = new Set(locations.map((location) => location.id));

  if (locationIds.size !== locations.length) {
    throw new Error("Generated environment contains duplicate location IDs.");
  }

  const npcs = Array.isArray(environment.npcs)
    ? environment.npcs.slice(0, 4).map((npc, index) => ({
        id: String(npc.id || ""),
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

  if (npcs.some((npc) => !availableNpcIdSet.has(npc.id))) {
    throw new Error("Generated environment references an NPC without portrait and idle assets.");
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

function validateLevelTaskFlow(tasks, items) {
  const taskIds = new Set(tasks.map((task) => task.taskId));

  if (taskIds.size !== tasks.length) {
    throw new Error("Generated level contains duplicate task IDs.");
  }

  const referencedItemIds = new Set(
    tasks.flatMap((task) => [task.rewardItem, task.requiredItem, task.removeItemOnSuccess].filter(Boolean))
  );

  if (items.some((item) => !referencedItemIds.has(item.id))) {
    throw new Error("Generated level contains an item that is unrelated to its task flow.");
  }

  const availableItems = new Set();

  tasks.forEach((task, index) => {
    if (task.requiredItem && !availableItems.has(task.requiredItem)) {
      throw new Error(`Generated level task ${task.taskId} requires an item that was not earned earlier.`);
    }

    if (task.removeItemOnSuccess && !availableItems.has(task.removeItemOnSuccess)) {
      throw new Error(`Generated level task ${task.taskId} removes an item that was not earned earlier.`);
    }

    if (task.rewardItem && index < tasks.length - 1) {
      const laterTasks = tasks.slice(index + 1);
      const itemSupportsLaterTask = laterTasks.some(
        (laterTask) =>
          laterTask.requiredItem === task.rewardItem || laterTask.removeItemOnSuccess === task.rewardItem
      );

      if (!itemSupportsLaterTask) {
        throw new Error(`Generated level reward from task ${task.taskId} is not used later in the level.`);
      }
    }

    if (task.rewardItem) {
      availableItems.add(task.rewardItem);
    }

    if (task.removeItemOnSuccess) {
      availableItems.delete(task.removeItemOnSuccess);
    }
  });
}

function haveSameWordTileMultiset(firstTiles, secondTiles) {
  if (firstTiles.length !== secondTiles.length) {
    return false;
  }

  const counts = new Map();

  firstTiles.forEach((tile) => {
    const key = normalizeAnswer(tile);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  for (const tile of secondTiles) {
    const key = normalizeAnswer(tile);
    const remaining = counts.get(key) || 0;

    if (remaining === 0) {
      return false;
    }

    counts.set(key, remaining - 1);
  }

  return [...counts.values()].every((count) => count === 0);
}

function shuffleWordTiles(tiles) {
  const shuffledTiles = [...tiles];

  for (let index = shuffledTiles.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledTiles[index], shuffledTiles[randomIndex]] = [shuffledTiles[randomIndex], shuffledTiles[index]];
  }

  if (shuffledTiles.length > 1 && shuffledTiles.every((tile, index) => tile === tiles[index])) {
    shuffledTiles.push(shuffledTiles.shift());
  }

  return shuffledTiles;
}

function normalizeTaskWordOrder(wordOrder, taskType, expectedExamples, taskId) {
  if (taskType === "free_text") {
    return null;
  }

  if (!wordOrder || typeof wordOrder !== "object") {
    throw new Error(`Generated word-order task ${taskId} has no wordOrder data.`);
  }

  const tiles = Array.isArray(wordOrder.tiles)
    ? wordOrder.tiles.map((tile) => String(tile || "").trim()).filter(Boolean)
    : [];
  const correctOrder = Array.isArray(wordOrder.correctOrder)
    ? wordOrder.correctOrder.map((tile) => String(tile || "").trim()).filter(Boolean)
    : [];

  if (tiles.length < 2 || tiles.length > 10 || correctOrder.length < 2 || correctOrder.length > 10) {
    throw new Error(`Generated word-order task ${taskId} has an invalid number of tiles.`);
  }

  if (!haveSameWordTileMultiset(tiles, correctOrder)) {
    throw new Error(`Generated word-order task ${taskId} uses different tiles and solution words.`);
  }

  const expectedSentence = normalizeAnswer(expectedExamples[0]);
  const correctSentence = normalizeAnswer(correctOrder.join(" "));

  if (!expectedSentence || expectedSentence !== correctSentence) {
    throw new Error(`Generated word-order task ${taskId} does not match its expected example.`);
  }

  return {
    tiles: shuffleWordTiles(tiles),
    correctOrder
  };
}

function normalizeLevel(level, scenario = null, taskTypePlan = []) {
  if (!level || typeof level !== "object") {
    throw new Error("Generated level is not an object.");
  }

  if (!worldModel.scenarioIds.includes(level.scenarioId)) {
    throw new Error("Generated level contains an invalid scenarioId.");
  }

  if (scenario && level.scenarioId !== scenario.scenarioId) {
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

  if (locations.some((location) => !availableBuildingLocationIdSet.has(location.id))) {
    throw new Error("Generated level references a location without a PNG building asset.");
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
        id: String(npc.id || ""),
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

  if (npcs.some((npc) => !availableNpcIdSet.has(npc.id))) {
    throw new Error("Generated level references an NPC without portrait and idle assets.");
  }

  if (scenario && scenario.allowedNpcs.length > 1 && npcs.length < 2) {
    throw new Error("Generated level needs at least two NPCs.");
  }

  if (scenario && npcs.some((npc) => !scenario.allowedNpcs.includes(npc.id))) {
    throw new Error("Generated level contains an NPC outside the selected scenario.");
  }

  const npcIds = new Set(npcs.map((npc) => npc.id));
  const items = [];
  const itemIds = new Set();

  for (const item of Array.isArray(level.items) ? level.items.slice(0, 5) : []) {
    const isAllowedItem =
      worldModel.items.includes(item.id) && (!scenario || scenario.allowedItems.includes(item.id));

    if (!isAllowedItem || itemIds.has(item.id)) {
      continue;
    }

    itemIds.add(item.id);
    items.push({
      id: item.id,
      nameGerman: String(item.nameGerman || item.id),
      nameSpanish: String(item.nameSpanish || item.id),
      category: String(item.category || "item")
    });
  }

  const referencedItemIds = new Set(
    (Array.isArray(level.tasks) ? level.tasks : []).flatMap((task) =>
      [task.rewardItem, task.requiredItem, task.removeItemOnSuccess].filter(Boolean)
    )
  );

  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!referencedItemIds.has(items[index].id)) {
      itemIds.delete(items[index].id);
      items.splice(index, 1);
    }
  }

  for (const itemId of referencedItemIds) {
    const isAllowedItem =
      worldModel.items.includes(itemId) && (!scenario || scenario.allowedItems.includes(itemId));

    if (!isAllowedItem || itemIds.has(itemId) || items.length >= 5) {
      continue;
    }

    const itemName = String(itemId).replace(/_/g, " ");
    itemIds.add(itemId);
    items.push({
      id: itemId,
      nameGerman: itemName,
      nameSpanish: itemName,
      category: "item"
    });
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

          const expectedExamples = Array.isArray(task.expectedExamples)
            ? task.expectedExamples.slice(0, 3).map((example) => String(example))
            : ["Hola."];
          const plannedTaskType = taskTypePlan[index];
          const taskType = plannedTaskType || (task.taskType === "word_order" ? "word_order" : "free_text");

          if (plannedTaskType && task.taskType !== plannedTaskType) {
            throw new Error(`Generated level task ${task.taskId} does not follow the requested task type plan.`);
          }

          const wordOrder = normalizeTaskWordOrder(task.wordOrder, taskType, expectedExamples, task.taskId);

          return {
            taskId: String(task.taskId || `task_${index + 1}`),
            order: index + 1,
            taskType,
            wordOrder,
            titleGerman: String(task.titleGerman || "Aufgabe"),
            instructionGerman: String(task.instructionGerman || "Antworte mit einem kurzen spanischen Satz."),
            locationId: task.locationId,
            npcId: task.npcId,
            npcName: String(task.npcName || task.npcId),
            npcSpanish: String(task.npcSpanish || "Hola."),
            expectedIntent: String(task.expectedIntent || ""),
            expectedExamples,
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

  validateLevelTaskFlow(tasks, items);

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
  const safeTitleGerman = sanitizeVisibleText(
    "titleGerman",
    level.titleGerman,
    expectedExamples,
    "Ein Tag in der Stadt"
  );
  const safeDescriptionGerman = sanitizeVisibleText(
    "descriptionGerman",
    level.descriptionGerman,
    expectedExamples,
    "Erledige mehrere kurze Aufgaben in dieser Alltagsszene."
  );
  vocabularyPreview = sanitizeVocabularyPreview(vocabularyPreview, expectedExamples);
  const safeTasks = tasks.map((task) => ({
    ...task,
    titleGerman: sanitizeVisibleText(
      `tasks.${task.taskId}.titleGerman`,
      task.titleGerman,
      task.expectedExamples,
      `Aufgabe ${task.order}`
    ),
    instructionGerman: sanitizeVisibleText(
      `tasks.${task.taskId}.instructionGerman`,
      task.instructionGerman,
      task.expectedExamples,
      getSafeTaskInstruction(task)
    ),
    npcSpanish: sanitizeVisibleText(
      `tasks.${task.taskId}.npcSpanish`,
      task.npcSpanish,
      task.expectedExamples,
      getSafeNpcLine(task)
    ),
    successMessageGerman: sanitizeVisibleText(
      `tasks.${task.taskId}.successMessageGerman`,
      task.successMessageGerman,
      task.expectedExamples,
      "Gut gemacht!"
    )
  }));

  return {
    levelId: String(level.levelId || `level_${Date.now()}`),
    scenarioId: level.scenarioId,
    titleGerman: safeTitleGerman,
    descriptionGerman: safeDescriptionGerman,
    backgroundTheme: String(level.backgroundTheme || "modern_city"),
    playerStartX: clampNumber(level.playerStartX, 20, 900, 120),
    vocabularyPreview,
    locations,
    npcs,
    items,
    tasks: safeTasks,
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

function getSafeLevelGenerationContext(requestBody = {}) {
  const recentScenarioIds = Array.isArray(requestBody.recentScenarioIds)
    ? requestBody.recentScenarioIds
        .filter((scenarioId) => worldModel.scenarioIds.includes(scenarioId))
        .slice(0, 4)
    : [];
  const recentTaskIntents = Array.isArray(requestBody.recentTaskIntents)
    ? requestBody.recentTaskIntents
        .map((intent) => String(intent || "").trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return {
    recentScenarioIds: [...new Set(recentScenarioIds)],
    recentTaskIntents
  };
}

function selectScenario(excludedScenarioIds = []) {
  const excludedIds = new Set(excludedScenarioIds);
  const viableScenarios = worldModel.scenarios.filter(
    (scenario) => scenario.allowedLocations.length >= 2 && scenario.allowedNpcs.length >= 2
  );
  const availableScenarios = viableScenarios.filter(
    (scenario) => !excludedIds.has(scenario.scenarioId)
  );
  const scenarioPool = availableScenarios.length > 0 ? availableScenarios : viableScenarios;

  if (scenarioPool.length === 0) {
    throw new Error("At least two PNG building assets are required to generate a level.");
  }

  const randomIndex = Math.floor(Math.random() * scenarioPool.length);

  return scenarioPool[randomIndex];
}

function selectLearningFocus(scenario, recentTaskIntents = []) {
  const recentIntentText = normalizeForSolutionLeakCheck(recentTaskIntents.join(" "));
  const goalKeywords = {
    introduce_yourself: ["introduce_yourself", "vorstell", "name"],
    order_food: ["order_food", "essen", "gericht", "speise"],
    order_drink: ["order_drink", "getrank", "trinken", "limonade", "wasser", "kaffee"],
    buy_food: ["buy_food", "lebensmittel", "brot", "obst"],
    ask_price: ["ask_price", "preis", "kostet"],
    ask_directions: ["ask_directions", "weg", "richtung", "wo ist"],
    check_in_hotel: ["check_in_hotel", "hotel", "eincheck", "reservierung"],
    ask_for_help: ["ask_for_help", "hilfe", "helfen"],
    greeting: ["greeting", "begru", "hallo"],
    give_item: ["give_item", "gib", "geb", "uberg", "bring"]
  };
  const unusedGoals = scenario.allowedLearningGoals.filter((goal) => {
    const keywords = goalKeywords[goal] || [goal];
    return !keywords.some((keyword) => recentIntentText.includes(keyword));
  });
  const goalPool = unusedGoals.length > 0 ? unusedGoals : scenario.allowedLearningGoals;

  return goalPool[Math.floor(Math.random() * goalPool.length)];
}

function getStoryPattern(learningFocus) {
  const storyPatterns = {
    introduce_yourself: "Begegne einer Person, stelle dich vor und nutze die neue Bekanntschaft für den nächsten Schritt.",
    order_food: "Finde den passenden Ort, bestelle etwas und verwende oder bringe die Bestellung anschließend weiter.",
    order_drink: "Finde den passenden Ort, bestelle ein Getränk und verwende oder bringe es anschließend weiter.",
    buy_food: "Kläre zuerst, was gebraucht wird, kaufe das Lebensmittel und bringe es zum passenden Ziel.",
    ask_price: "Finde einen Gegenstand, frage nach dem Preis und triff danach eine passende Kaufentscheidung.",
    ask_directions: "Frage zuerst nach dem Weg und gehe danach zum genannten Ziel, um dort etwas zu erledigen.",
    check_in_hotel: "Komme am Hotel an, kläre den Check-in und nutze die erhaltene Information oder den Gegenstand.",
    ask_for_help: "Stoße auf ein kleines Alltagsproblem, bitte um Hilfe und setze die erhaltene Hilfe am nächsten Ort um.",
    greeting: "Begrüße eine Person und führe die Begegnung mit einer einfachen passenden Bitte weiter.",
    give_item: "Besorge oder erhalte zuerst einen Gegenstand und überreiche ihn anschließend der richtigen Person."
  };

  return storyPatterns[learningFocus] || "Verbinde alle Aufgaben zu einer kurzen, nachvollziehbaren Alltagssituation.";
}

function createTaskTypePlan() {
  const firstTwoTaskTypes = Math.random() < 0.5
    ? ["free_text", "word_order"]
    : ["word_order", "free_text"];

  return [
    ...firstTwoTaskTypes,
    Math.random() < 0.5 ? "free_text" : "word_order"
  ];
}

function getDummyHint(questContext, hintLevel = 1) {
  const currentStep = questContext.currentStep || "buy_lemonade";

  if (currentStep === "generated_level_task" || currentStep === "generated_quest") {
    const expectedExample = Array.isArray(questContext.expectedExamples) ? questContext.expectedExamples[0] || null : null;
    const starterWordCount = Number(hintLevel) >= 2 ? 2 : 1;
    const sentenceStarter = expectedExample
      ? `${expectedExample.split(" ").slice(0, starterWordCount).join(" ")}...`
      : null;

    return {
      hintLevel,
      hintGerman:
        Number(hintLevel) >= 3
          ? "Achte auf die Satzstellung und verbessere gezielt den Teil, bei dem du noch unsicher bist."
          : "Nutze die Vokabeln aus der Vorschau und bilde selbst einen kurzen Satz.",
      sentenceStarter: sentenceStarter || null,
      vocabulary: Array.isArray(questContext.vocabulary) ? questContext.vocabulary.slice(0, 5) : [],
      exampleAnswer: null
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
      exampleAnswer: null
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
    exampleAnswer: null
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
    "Gib auf keiner Hilfestufe eine vollständige Lösung oder Beispielantwort aus.",
    "exampleAnswer muss immer null sein.",
    "sentenceStarter darf höchstens zwei Wörter enthalten und niemals bereits die vollständige Antwort sein.",
    "vocabulary darf nur einzelne Wörter oder kurze Wortgruppen mit höchstens zwei Wörtern enthalten.",
    "hintGerman darf expectedExamples weder zitieren noch Wort für Wort rekonstruieren.",
    "Nutze stattdessen Bedeutungen, Übersetzungen, Grammatikhinweise und Hinweise zur Satzstruktur.",
    "",
    "Kontextregeln:",
    "- currentStep buy_lemonade: Hilf dem Nutzer, höflich eine Limonade zu bestellen.",
    "- currentStep bring_to_carlos: Hilf dem Nutzer, Carlos zu sagen, dass er seine Limonade hat oder sie ihm gibt.",
    "- hintLevel 1 erklärt nur Absicht oder Situation und bietet einzelne Vokabeln.",
    "- hintLevel 2 darf zusätzlich einen sehr kurzen Satzanfang geben.",
    "- hintLevel 3 darf die letzte Antwort analysieren und einen Strukturhinweis geben, aber weiterhin keine Komplettlösung.",
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
    "Nutze nur erlaubte scenarioIds, locationIds, location types, NPC IDs, learningGoals und Items aus dem World Model.",
    "Jede locationId entspricht einem vorhandenen PNG-Asset. Erfinde keine weiteren Orte oder Gebäude.",
    "Jede NPC-ID besitzt ein festes Portrait und Idle-Sprite. Erfinde keine weiteren NPC-IDs.",
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
      locationIds: worldModel.locations,
      locationTypes: worldModel.locationTypes,
      npcs: worldModel.npcs,
      learningGoals: worldModel.learningGoals,
      items: worldModel.items
    })}`
  ].join("\n");
}

function buildLevelPrompt(scenario, generationContext = {}, learningFocus = null, taskTypePlan = []) {
  const allowedScenarioIds = [scenario.scenarioId];
  const storyPattern = getStoryPattern(learningFocus);
  const allowedWorldFrame = {
    scenarioFrameId: scenario.id,
    scenarioIds: allowedScenarioIds,
    locationIds: scenario.allowedLocations,
    locationTypes: worldModel.locationTypes,
    npcs: scenario.allowedNpcs,
    learningGoals: scenario.allowedLearningGoals,
    items: scenario.allowedItems,
    primaryLearningGoal: learningFocus,
    storyPattern,
    taskTypePlan
  };

  return [
    "Du bist der AI Game Director und Sprachdidaktiker für Spanish Street Quest.",
    "Erzeuge genau ein Level für absolute Spanisch-Anfänger auf Niveau A1.",
    "Antworte ausschließlich mit JSON, das exakt dem Schema entspricht.",
    "Nutze ausschließlich IDs aus dem angegebenen erlaubten Szenario-Rahmen.",
    "level.scenarioId muss aus scenarioIds im erlaubten Szenario-Rahmen stammen.",
    "locations[].id muss aus locationIds im erlaubten Szenario-Rahmen stammen.",
    "Jede erlaubte locationId besitzt ein festes PNG-Asset. Erfinde keine weiteren Gebäude, Orte oder IDs.",
    "npcs[].id muss aus npcs im erlaubten Szenario-Rahmen stammen.",
    "Jede erlaubte NPC-ID besitzt ein festes Portrait und Idle-Sprite. Erfinde keine weiteren Figuren oder IDs.",
    "items[].id muss aus items im erlaubten Szenario-Rahmen stammen.",
    "Nimm in items nur Dinge auf, die in tasks als rewardItem, requiredItem oder removeItemOnSuccess gebraucht werden.",
    "Bevorzuge abwechslungsreiche Alltagsziele aus learningGoals. Nutze order_drink nur, wenn es wirklich zum Szenario passt.",
    `Das primaere Lernziel dieses Levels ist ${learningFocus}. Mindestens eine Aufgabe muss dieses Ziel umsetzen.`,
    "Vermeide inhaltliche Wiederholungen der zuletzt erzeugten Aufgaben.",
    `Zuletzt verwendete Aufgabenabsichten: ${JSON.stringify(generationContext.recentTaskIntents || [])}`,
    "Das Level besteht aus einer einfachen Umgebung, einer Vokabel-Vorschau und 2-3 kurzen Aufgaben.",
    "Setze taskType für jede Aufgabe exakt gemäß taskTypePlan anhand ihrer Reihenfolge. Nutze bei zwei Aufgaben die ersten zwei Einträge.",
    "Bei taskType free_text muss wordOrder null sein.",
    "Bei taskType word_order muss wordOrder ein Objekt mit 3-8 kurzen Wortkärtchen sein.",
    "wordOrder.correctOrder enthält die Wörter in richtiger Reihenfolge; mit Leerzeichen verbunden muss es exakt expectedExamples[0] ergeben.",
    "wordOrder.tiles enthält exakt dieselben Wörter wie correctOrder, darf aber in beliebiger Reihenfolge stehen.",
    "Wortreihenfolge-Aufgaben müssen kurze eindeutige A1-Sätze ohne alternative Wortstellung verwenden.",
    "Jedes Level muss eine kleine Handlungskette mit mindestens zwei Stationen haben.",
    `Nutze diesen Handlungsbogen als roten Faden: ${storyPattern}`,
    "descriptionGerman beschreibt die Ausgangssituation und genau ein gemeinsames Levelziel, ohne eine Lösung vorzugeben.",
    "Jede Aufgabe muss ein notwendiger nächster Schritt für dieses gemeinsame Ziel sein und logisch aus der vorherigen Aufgabe folgen.",
    "Erzeuge keine lose Sammlung voneinander unabhängiger Sprachübungen.",
    "Der NPC-Dialog einer späteren Aufgabe muss zur Handlung passen, die in den vorherigen Aufgaben entstanden ist.",
    "summaryGerman schließt dasselbe gemeinsame Levelziel ab.",
    "Variiere die Aktionen passend zum Lernziel: begruessen, sich vorstellen, nach Weg, Preis oder Hilfe fragen, bestellen, kaufen, einchecken oder einen Gegenstand uebergeben.",
    "Nutze nicht in jedem Level dieselbe Kaufen-und-Weitergeben-Abfolge.",
    "Nutze bei 2-3 Aufgaben mindestens zwei verschiedene task.locationId und mindestens zwei verschiedene task.npcId.",
    "Vermeide Levels, in denen der Spieler mehrfach am selben Ort mit derselben Person interagiert.",
    "Wenn es sinnvoll ist, soll mindestens eine Aufgabe ein rewardItem geben und eine spätere Aufgabe dieses Item als requiredItem oder removeItemOnSuccess nutzen.",
    "Ein requiredItem oder removeItemOnSuccess muss immer in einer früheren Aufgabe als rewardItem vergeben worden sein.",
    "Ein rewardItem aus einer Aufgabe vor dem letzten Schritt muss in einer späteren Aufgabe benötigt oder entfernt werden.",
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

  if ((schema.type === "object" || schemaTypes.includes("object")) && value !== null) {
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

  if ((schema.type === "array" || schemaTypes.includes("array")) && Array.isArray(value)) {
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

function getHintExpectedExamples(questContext) {
  return Array.isArray(questContext.expectedExamples)
    ? questContext.expectedExamples.map((example) => String(example || "")).filter(Boolean)
    : [];
}

function hintTextRevealsFullSolution(value, expectedExamples) {
  const normalizedValue = normalizeForSolutionLeakCheck(value);
  const visibleTokens = new Set(normalizedValue.split(/\s+/).filter(Boolean));

  return expectedExamples.some((example) => {
    const normalizedExample = normalizeForSolutionLeakCheck(example);

    if (!normalizedExample) {
      return false;
    }

    if (normalizedValue.includes(normalizedExample)) {
      return true;
    }

    const solutionTokens = normalizedExample.split(/\s+/).filter(Boolean);
    return solutionTokens.length >= 2 && solutionTokens.every((token) => visibleTokens.has(token));
  });
}

function limitSentenceStarter(sentenceStarter, hintLevel, expectedExamples) {
  if (typeof sentenceStarter !== "string" || !sentenceStarter.trim()) {
    return null;
  }

  const words = sentenceStarter.replace(/\.+$/g, "").trim().split(/\s+/);
  const wordLimit = Number(hintLevel) >= 2 ? 2 : 1;
  const limitedWords = words.slice(0, wordLimit);

  while (
    limitedWords.length > 0 &&
    hintTextRevealsFullSolution(limitedWords.join(" "), expectedExamples)
  ) {
    limitedWords.pop();
  }

  return limitedWords.length > 0 ? `${limitedWords.join(" ")}...` : null;
}

function sanitizeHintVocabulary(vocabulary, fallbackVocabulary, expectedExamples) {
  const sanitizeEntries = (entries) => {
    const uniqueEntries = new Map();

    (Array.isArray(entries) ? entries : []).slice(0, 5).forEach((entry) => {
      const de = String(entry.de || "").trim();
      const es = String(entry.es || "").trim();
      const spanishWordCount = es.split(/\s+/).filter(Boolean).length;

      if (!de || !es || spanishWordCount > 2 || hintTextRevealsFullSolution(es, expectedExamples)) {
        return;
      }

      uniqueEntries.set(normalizeForSolutionLeakCheck(es), { de, es });
    });

    return [...uniqueEntries.values()];
  };
  const mergedVocabulary = new Map();

  [...sanitizeEntries(vocabulary), ...sanitizeEntries(fallbackVocabulary)].forEach((entry) => {
    if (mergedVocabulary.size < 5) {
      mergedVocabulary.set(normalizeForSolutionLeakCheck(entry.es), entry);
    }
  });

  return [...mergedVocabulary.values()];
}

function normalizeHint(hint, questContext, hintLevel) {
  const fallbackHint = getDummyHint(questContext, hintLevel);
  const safeHintLevel = Math.max(1, Math.min(Number(hint.hintLevel || hintLevel) || 1, 3));
  const expectedExamples = getHintExpectedExamples(questContext);
  const candidateSentenceStarter =
    typeof hint.sentenceStarter === "string" || hint.sentenceStarter === null
      ? hint.sentenceStarter
      : fallbackHint.sentenceStarter;
  const candidateHintGerman = truncateSentences(hint.hintGerman, 2);
  const safeHintGerman =
    candidateHintGerman && !hintTextRevealsFullSolution(candidateHintGerman, expectedExamples)
      ? candidateHintGerman
      : fallbackHint.hintGerman;

  return {
    hintLevel: safeHintLevel,
    hintGerman: safeHintGerman,
    sentenceStarter: limitSentenceStarter(candidateSentenceStarter, safeHintLevel, expectedExamples),
    vocabulary: sanitizeHintVocabulary(hint.vocabulary, fallbackHint.vocabulary, expectedExamples),
    exampleAnswer: null
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

async function generateLevelWithOpenAI(scenario, generationContext = {}) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const learningFocus = selectLearningFocus(scenario, generationContext.recentTaskIntents);
  const taskTypePlan = createTaskTypePlan();
  const scenarioLevelSchema = createLevelSchemaForScenario(scenario);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

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
        input: buildLevelPrompt(scenario, generationContext, learningFocus, taskTypePlan),
        text: {
          format: {
            type: "json_schema",
            name: "spanish_street_quest_level",
            strict: true,
            schema: scenarioLevelSchema
          }
        }
      })
    });

    if (!response.ok) {
      const error = new Error(`OpenAI API error: ${response.status}`);
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    }

    const responseData = await response.json();
    const outputText = extractOutputText(responseData);
    const parsedLevel = parseStructuredOutput(outputText, scenarioLevelSchema, "level");

    return normalizeLevel(parsedLevel, scenario, taskTypePlan);
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

  if (currentStep === "generated_level_task" && safeQuestContext.taskType === "word_order") {
    return res.json(
      normalizeEvaluation(evaluateWordOrderTask(normalizedAnswer, normalizedQuestContext), normalizedQuestContext)
    );
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
    return res.json(
      normalizeHint(getDummyHint(normalizedQuestContext, safeHintLevel), normalizedQuestContext, safeHintLevel)
    );
  }

  try {
    const aiHint = await generateHintWithOpenAI(normalizedQuestContext, lastUserAnswer, safeHintLevel);

    if (aiHint) {
      return res.json(aiHint);
    }
  } catch (error) {
    console.error("OpenAI hint generation failed, using dummy fallback:", error.message);
  }

  return res.json(
    normalizeHint(getDummyHint(normalizedQuestContext, safeHintLevel), normalizedQuestContext, safeHintLevel)
  );
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
  let generationError = null;

  try {
    const generatedQuest = await generateQuestWithOpenAI();

    if (generatedQuest) {
      return res.json(generatedQuest);
    }
  } catch (error) {
    generationError = error;
    console.error("OpenAI quest generation failed:", error.message);
  }

  if (USE_GENERATION_FALLBACKS) {
    console.warn("Using fallback quest because USE_GENERATION_FALLBACKS=true.");
    return res.json(getFallbackGeneratedQuest());
  }

  return sendGenerationUnavailable(
    res,
    "quest",
    generationError ? generationError.message : "Keine KI-Quest generiert. Fallbacks sind deaktiviert."
  );
});

app.post("/api/generate-environment", async (req, res) => {
  let generationError = null;

  try {
    const generatedEnvironment = await generateEnvironmentWithOpenAI();

    if (generatedEnvironment) {
      return res.json(generatedEnvironment);
    }
  } catch (error) {
    generationError = error;
    console.error("OpenAI environment generation failed:", error.message);
  }

  if (USE_GENERATION_FALLBACKS) {
    console.warn("Using fallback environment because USE_GENERATION_FALLBACKS=true.");
    return res.json(getFallbackEnvironment());
  }

  return sendGenerationUnavailable(
    res,
    "environment",
    generationError ? generationError.message : "Keine KI-Umgebung generiert. Fallbacks sind deaktiviert."
  );
});

app.post("/api/generate-level", async (req, res) => {
  let generationError = null;
  const generationContext = getSafeLevelGenerationContext(req.body);
  const excludedScenarioIds = new Set(generationContext.recentScenarioIds);

  for (let attempt = 1; attempt <= MAX_LEVEL_GENERATION_ATTEMPTS; attempt += 1) {
    const scenario = selectScenario([...excludedScenarioIds]);
    excludedScenarioIds.add(scenario.scenarioId);

    try {
      const generatedLevel = await generateLevelWithOpenAI(scenario, generationContext);

      if (generatedLevel) {
        console.log(
          `Generated AI level for scenario ${generatedLevel.scenarioId} on attempt ${attempt}/${MAX_LEVEL_GENERATION_ATTEMPTS}.`
        );
        return res.json(generatedLevel);
      }

      break;
    } catch (error) {
      generationError = error;
      console.error(
        `OpenAI level generation attempt ${attempt}/${MAX_LEVEL_GENERATION_ATTEMPTS} failed for scenario ${scenario.scenarioId}:`,
        error.message
      );

      if (error.retryable === false) {
        break;
      }
    }
  }

  if (USE_GENERATION_FALLBACKS) {
    console.warn("Using fallback level because USE_GENERATION_FALLBACKS=true.");
    return res.json(getFallbackLevel());
  }

  return sendGenerationUnavailable(
    res,
    "level",
    generationError ? generationError.message : "Kein KI-Level generiert. Fallbacks sind deaktiviert."
  );
});

app.listen(PORT, () => {
  console.log(`Spanish Street Quest server running at http://localhost:${PORT}`);
});
