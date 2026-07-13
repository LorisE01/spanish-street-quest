(function exposeLevelCatalog(globalObject) {
  const levels = Object.freeze([
    Object.freeze({
      id: "level_bus_stop",
      number: 1,
      scenarioId: "bus_stop",
      titleGerman: "Bushaltestelle",
      descriptionGerman: "Orientiere dich unterwegs und sprich mit Menschen an der Haltestelle.",
      buildingId: "bus_stop",
      primaryNpcId: "bus_driver"
    }),
    Object.freeze({
      id: "level_hotel",
      number: 2,
      scenarioId: "hotel",
      titleGerman: "Hotel",
      descriptionGerman: "Meistere einfache Gespr\u00e4che rund um Ankunft und Aufenthalt.",
      buildingId: "hotel",
      primaryNpcId: "receptionist"
    }),
    Object.freeze({
      id: "level_supermarket",
      number: 3,
      scenarioId: "supermarket",
      titleGerman: "Supermarkt",
      descriptionGerman: "Erledige einen kleinen Einkauf in einer spanischen Alltagssituation.",
      buildingId: "supermarket",
      primaryNpcId: "cashier"
    }),
    Object.freeze({
      id: "level_drink_stand",
      number: 4,
      scenarioId: "drink_stand",
      titleGerman: "Getr\u00e4nkestand",
      descriptionGerman: "F\u00fchre ein kurzes Gespr\u00e4ch am Stand und l\u00f6se eine Aufgabe im Park.",
      buildingId: "drink_stand",
      primaryNpcId: "vendor"
    }),
    Object.freeze({
      id: "level_cafe",
      number: 5,
      scenarioId: "cafe",
      titleGerman: "Caf\u00e9",
      descriptionGerman: "Verst\u00e4ndige dich bei einem Besuch im Caf\u00e9.",
      buildingId: "cafe",
      primaryNpcId: "barista"
    }),
    Object.freeze({
      id: "level_restaurant",
      number: 6,
      scenarioId: "restaurant",
      titleGerman: "Restaurant",
      descriptionGerman: "Bew\u00e4ltige eine kurze Situation beim Essen gehen.",
      buildingId: "restaurant",
      primaryNpcId: "waiter"
    }),
    Object.freeze({
      id: "level_clothing_store",
      number: 7,
      scenarioId: "clothing_store",
      titleGerman: "Kleidungsgesch\u00e4ft",
      descriptionGerman: "Finde dich beim Kleidungskauf mit einfachen S\u00e4tzen zurecht.",
      buildingId: "clothing_store",
      primaryNpcId: "shop_assistant"
    }),
    Object.freeze({
      id: "level_post_office",
      number: 8,
      scenarioId: "post_office",
      titleGerman: "Postfiliale",
      descriptionGerman: "L\u00f6se eine kleine Aufgabe rund um Post und Versand.",
      buildingId: "post_office",
      primaryNpcId: "postal_worker"
    }),
    Object.freeze({
      id: "level_park",
      number: 9,
      scenarioId: "park",
      titleGerman: "Park",
      descriptionGerman: "Begegne verschiedenen Personen und finde dich im Park zurecht.",
      buildingId: "park",
      primaryNpcId: "park_guard"
    })
  ]);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = levels;
  }

  if (globalObject) {
    globalObject.LEVEL_CATALOG = levels;
  }
})(typeof window !== "undefined" ? window : null);
