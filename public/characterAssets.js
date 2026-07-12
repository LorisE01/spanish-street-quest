(function exposeCharacterAssets(globalObject) {
  const catalog = Object.freeze({
    vendor: Object.freeze({
      name: "Verkäufer",
      portrait: "/assets/characters/cashier.png",
      sprite: "/assets/characters/cashier_idle.png"
    }),
    cashier: Object.freeze({
      name: "Kassiererin",
      portrait: "/assets/characters/Supermarkt_Kassiererin_Portrait.png",
      sprite: "/assets/characters/Supermarkt_Kassiererin_Idle.png"
    }),
    waiter: Object.freeze({
      name: "Kellner",
      portrait: "/assets/characters/Restaurant_Kellner_Portrait.png",
      sprite: "/assets/characters/Restaurant_Kellner_Idle.png"
    }),
    barista: Object.freeze({
      name: "Barista",
      portrait: "/assets/characters/Cafe_Barista_Portrait.png",
      sprite: "/assets/characters/Cafe_Barista_Idle.png"
    }),
    receptionist: Object.freeze({
      name: "Rezeptionistin",
      portrait: "/assets/characters/Hotel_Rezeptionistin_Portrait.png",
      sprite: "/assets/characters/Hotel_Rezeptionistin_Idle.png"
    }),
    postal_worker: Object.freeze({
      name: "Postangestellter",
      portrait: "/assets/characters/Postangestellter_Portrait.png",
      sprite: "/assets/characters/Postangestellter_Idle.png"
    }),
    bus_driver: Object.freeze({
      name: "Busfahrer",
      portrait: "/assets/characters/Busfahrer_Portrait.png",
      sprite: "/assets/characters/Busfahrer_Idle.png"
    }),
    shop_assistant: Object.freeze({
      name: "Verkäuferin",
      portrait: "/assets/characters/Kleidungsgeschäft_Verkäuferin_Portrait.png",
      sprite: "/assets/characters/Kleidungsgeschäft_Verkäuferin_Idle.png"
    }),
    carlos: Object.freeze({
      name: "Carlos",
      portrait: "/assets/characters/carlos.png",
      sprite: "/assets/characters/carlos_idle.png"
    }),
    passerby: Object.freeze({
      name: "Passant",
      portrait: "/assets/characters/Passant_Portrait.png",
      sprite: "/assets/characters/Passant_Idle.png"
    }),
    park_guard: Object.freeze({
      name: "Parkwächterin",
      portrait: "/assets/characters/Parkwächterin_Portrait.png",
      sprite: "/assets/characters/Parkwächterin_Idle.png"
    }),
    tourist: Object.freeze({
      name: "Touristin",
      portrait: "/assets/characters/Touristin_Portrait.png",
      sprite: "/assets/characters/Touristin_Idle.png"
    })
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = catalog;
  }

  if (globalObject) {
    globalObject.CHARACTER_ASSETS = catalog;
  }
})(typeof window !== "undefined" ? window : null);
