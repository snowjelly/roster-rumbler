/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-restricted-syntax */
const fs = require("node:fs");
const path = require("node:path");
const { Client, Events, Collection, GatewayIntentBits } = require("discord.js");
const { token } = require("../config.json");
const logger = require("./logger");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once(Events.ClientReady, () => logger.info("The bot is online"));
client.on(Events.Debug, (info) => logger.debug(info));
client.on(Events.Warn, (info) => logger.warn(info));
client.on(Events.Error, (error) => logger.error(error));

client.cooldowns = new Collection();
client.commands = new Collection();
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath);
  for (const file of commandFiles) {
    if (file.endsWith(".disabled")) break;
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else if (!file.endsWith(".json")) {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}
client.login(token);
