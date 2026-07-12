(function exposeBuildingAssets(globalObject) {
  const catalog = Object.freeze({
    bus_stop: Object.freeze({
      src: "/assets/buildings/Bushaltestelle.png",
      width: 230
    }),
    cafe: Object.freeze({
      src: "/assets/buildings/Cafe.png",
      width: 260
    }),
    drink_stand: Object.freeze({
      src: "/assets/buildings/Limonadenstand.png",
      width: 250
    }),
    hotel: Object.freeze({
      src: "/assets/buildings/Hotel.png",
      width: 300
    }),
    clothing_store: Object.freeze({
      src: "/assets/buildings/Kleiderladen.png",
      width: 285
    }),
    park: Object.freeze({
      src: "/assets/buildings/Park.png",
      width: 280
    }),
    post_office: Object.freeze({
      src: "/assets/buildings/Post.png",
      width: 260
    }),
    restaurant: Object.freeze({
      src: "/assets/buildings/Restaurant.png",
      width: 285
    }),
    supermarket: Object.freeze({
      src: "/assets/buildings/Supermarkt.png",
      width: 320
    })
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = catalog;
  }

  if (globalObject) {
    globalObject.BUILDING_ASSETS = catalog;
  }
})(typeof window !== "undefined" ? window : null);
