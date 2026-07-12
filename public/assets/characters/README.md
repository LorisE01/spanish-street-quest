# Character Assets

Lege hier Pixelart-Assets fuer spielbare Figuren und NPCs ab.

Die zentrale Zuordnung von NPC-ID, Portrait und Idle-Sprite steht in
`public/characterAssets.js`. Das Backend verwendet nur NPC-Eintraege, bei denen
beide Dateien im Ordner vorhanden sind.

Verwendete NPC-IDs:

- `vendor`
- `cashier`
- `waiter`
- `barista`
- `receptionist`
- `postal_worker`
- `bus_driver`
- `shop_assistant`
- `carlos`
- `passerby`
- `park_guard`
- `tourist`

Neue NPCs brauchen einen Katalogeintrag mit `portrait` und `sprite` sowie eine
Freigabe in den passenden `allowedNpcs` des World Models in `server.js`.
