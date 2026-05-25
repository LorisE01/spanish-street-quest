const QUESTS = [
  {
    id: "lemonade-for-carlos",
    title: "Kaufe eine Limonade für Carlos",
    completedTitle: "Quest abgeschlossen",
    status: "active",
    steps: {
      buy_lemonade: {
        id: "buy_lemonade",
        title: "Kaufe eine Limonade für Carlos",
        npc: "Verkäufer",
        targetLocationId: "drink-stand",
        prompt: "Hola, ¿qué quieres beber?",
        expectedIntent: "order_lemonade",
        expectedExamples: ["Quiero una limonada, por favor."],
        xpReward: 20,
        inventoryReward: "Limonade",
        nextStep: "bring_to_carlos"
      },
      bring_to_carlos: {
        id: "bring_to_carlos",
        title: "Bringe die Limonade zu Carlos",
        npc: "Carlos",
        targetLocationId: "carlos",
        prompt: "¿Tienes mi limonada?",
        expectedIntent: "give_lemonade_to_carlos",
        expectedExamples: [
          "Sí, tengo tu limonada.",
          "Tengo tu limonada.",
          "Aquí tienes tu limonada."
        ],
        xpReward: 25,
        requiredItem: "Limonade"
      }
    }
  }
];
