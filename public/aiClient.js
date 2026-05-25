const aiClient = {
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
  }
};
