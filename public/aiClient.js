const aiClient = {
  async generateLevel() {
    const response = await fetch("/api/generate-level", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error("Level konnte nicht geladen werden.");
    }

    return response.json();
  },

  async generateEnvironment() {
    const response = await fetch("/api/generate-environment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error("Umgebung konnte nicht geladen werden.");
    }

    return response.json();
  },

  async generateQuest() {
    const response = await fetch("/api/generate-quest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error("Quest konnte nicht geladen werden.");
    }

    return response.json();
  },

  async evaluateAnswer(userAnswer, questContext) {
    const response = await fetch("/api/evaluate-answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userAnswer,
        questContext
      })
    });

    if (!response.ok) {
      throw new Error("Antwortbewertung konnte nicht geladen werden.");
    }

    return response.json();
  },

  async generateHint(questContext, lastUserAnswer, hintLevel) {
    const response = await fetch("/api/generate-hint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        questContext,
        lastUserAnswer,
        hintLevel
      })
    });

    if (!response.ok) {
      throw new Error("Hilfestellung konnte nicht geladen werden.");
    }

    return response.json();
  },

  async generateItemImage(item, taskContext) {
    const response = await fetch("/api/generate-item-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        item,
        taskContext
      })
    });

    if (!response.ok) {
      throw new Error("Itembild konnte nicht geladen werden.");
    }

    return response.json();
  },

  async generateItemChoices(taskContext, expectedItem, availableItems) {
    const response = await fetch("/api/generate-item-choices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        taskContext,
        expectedItem,
        availableItems
      })
    });

    if (!response.ok) {
      throw new Error("Itemauswahl konnte nicht geladen werden.");
    }

    return response.json();
  }
};
