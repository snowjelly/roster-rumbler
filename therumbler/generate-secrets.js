const fs = require("fs");
const path = require("node:path");
const { getDiscordSecrets } = require("./database");

const envPath = path.join(__dirname, "../", "config.json");

(async () => {
  fs.writeFileSync(
    envPath,
    JSON.stringify(await getDiscordSecrets()),
    (err) => {
      if (err) {
        console.error(err);
      }
    }
  );
})();
