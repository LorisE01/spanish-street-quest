require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-nano";
const OPENAI_API_URL = "https://api.openai.com/v1/responses";

const evaluationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "result",
    "isCorrect",
    "intentMatched",
    "feedbackGerman",
    "correctedSpanish",
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
      xpReward: Number(questContext.xpReward || 20),
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

function getDummyEvaluation(normalizedAnswer, questContext) {
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

function buildEvaluationPrompt(userAnswer, questContext) {
  return [
    "Bewerte eine kurze spanische Antwort in einem Anfänger-Sprachlernspiel.",
    "Antworte ausschließlich mit JSON, das exakt dem Schema entspricht.",
    "feedbackGerman darf maximal 2 kurze Sätze haben.",
    "mistakes darf maximal 1-2 Einträge enthalten.",
    "",
    "Regeln:",
    "- currentStep buy_lemonade: correct nur, wenn die Antwort ausdrückt, dass der Nutzer eine Limonade bestellen möchte.",
    "- buy_lemonade correct: xpReward 20, nextAction complete_step, inventoryReward Limonade.",
    "- buy_lemonade partial: xpReward 5, nextAction retry, inventoryReward null.",
    "- buy_lemonade wrong: xpReward 0, nextAction show_hint, inventoryReward null.",
    "- currentStep bring_to_carlos: correct nur, wenn die Antwort ausdrückt, dass der Nutzer Carlos die Limonade gibt oder hat.",
    "- bring_to_carlos correct: xpReward 25, nextAction complete_quest, inventoryReward null.",
    "- bring_to_carlos partial: xpReward 5, nextAction retry, inventoryReward null.",
    "- bring_to_carlos wrong: xpReward 0, nextAction show_hint, inventoryReward null.",
    "",
    `Quest-Kontext: ${JSON.stringify(questContext)}`,
    `Nutzerantwort: ${userAnswer}`
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

  if (currentStep === "bring_to_carlos") {
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
    xpReward,
    nextAction,
    inventoryReward,
    mistakes
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
    const parsedEvaluation = JSON.parse(outputText);

    return normalizeEvaluation(parsedEvaluation, questContext);
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
    return res.json(getCompletedQuestEvaluation());
  }

  if (!normalizedAnswer) {
    return res.json(getDummyEvaluation(normalizedAnswer, normalizedQuestContext));
  }

  try {
    const aiEvaluation = await evaluateWithOpenAI(userAnswer, normalizedQuestContext);

    if (aiEvaluation) {
      return res.json(aiEvaluation);
    }
  } catch (error) {
    console.error("OpenAI evaluation failed, using dummy fallback:", error.message);
  }

  return res.json(getDummyEvaluation(normalizedAnswer, normalizedQuestContext));
});

app.listen(PORT, () => {
  console.log(`Spanish Street Quest server running at http://localhost:${PORT}`);
});
