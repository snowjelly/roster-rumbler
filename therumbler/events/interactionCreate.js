const { Events, Collection } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const Keyv = require("keyv");
const database = require("../database");
const { getStringSelectMenu } = require("../commands/main/registerdlc");

const keyv = new Keyv();

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const userData = await database.membersCollection.findOne({
      discordUsername: interaction.user.username,
      discordId: interaction.user.id,
    });
    if (userData === null)
      await database.generateMemberDocument(
        interaction.user.username,
        interaction.user.id
      );

    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      const { cooldowns } = interaction.client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const defaultCooldownDuration = 0;
      const cooldownAmount =
        ((await command.cooldown) ?? defaultCooldownDuration) * 1_000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime =
          timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1_000);
          interaction.reply({
            content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
            ephemeral: true,
          });
          setTimeout(() => interaction.deleteReply(), 5_000);
          return;
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      if (interaction.commandName === "registerdlc") {
        const multi = await getStringSelectMenu(interaction);
        const response = await interaction.reply({
          content: "Select your DLC fighters",
          components: [multi],
          ephemeral: true,
        });
        keyv.addListener("interactionReceived", () =>
          interaction.deleteReply()
        );
        const collectorFilter = (i) => i.user.id === interaction.user.id;
        try {
          const confirmation = await response.awaitMessageComponent({
            filter: collectorFilter,
            time: 120_000,
          });
        } catch (e) {
          await interaction.editReply({
            content: "DLC not changed within `2 minutes`, cancelling",
            components: [],
          });
          await wait(3_000);
          interaction.deleteReply();
        }
      } else {
        if (!command) {
          console.error(
            `No command matching ${interaction.commandName} was found.`
          );
          return;
        }

        try {
          await command.execute(interaction);
        } catch (error) {
          console.error(error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: "There was an error while executing this command!",
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: "There was an error while executing this command!",
              ephemeral: true,
            });
          }
        }
      }
    }

    if (interaction.isStringSelectMenu()) {
      const result = await database.membersCollection.findOneAndUpdate(
        {
          discordUsername: interaction.user.username,
          discordId: interaction.user.id,
        },
        {
          $set: {
            dlcFighters: interaction.values,
          },
        },
        { upsert: true, returnDocument: "after" }
      );

      keyv.emit("interactionReceived");

      const multi = await getStringSelectMenu(interaction, "disabled");
      await interaction.reply({
        content: "Updated your DLC",
        components: [multi],
        ephemeral: true,
      });
      await wait(10_000);
      interaction.deleteReply();
    }
  },
};
