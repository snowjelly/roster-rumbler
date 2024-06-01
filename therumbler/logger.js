const pino = require("pino");
const path = require("node:path");

const transport = pino.transport({
  target: "pino/file",
  options: { destination: path.join(__dirname, "../", "logs", "log.json") },
});
const logger = pino(transport);
module.exports = logger;
