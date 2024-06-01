const { SlashCommandBuilder } = require("discord.js");
const Keyv = require("keyv");
const mongo_uri = require("../../mongo_uri");
const keyv = new Keyv(`${mongo_uri}/keyv`);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trackrolldata")
    .setDescription(
      `ADMIN: Enable \`rollHistory\` and \`timesRolled\` statistics on player profiles`
    )
    .addBooleanOption((option) =>
      option
        .setName("boolean")
        .setDescription("enable? `true` or `false`")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    const result = interaction.options.getBoolean("boolean");
    const isRollDataTracked = await keyv.get("trackRollData");
    if (result) {
      if (isRollDataTracked) {
        await interaction.reply({
          content: `Tracking \`rollHistory\` and \`timesRolled\` statistics on player profiles is already **enabled**`,
          ephemeral: true,
        });
        return;
      }
      await keyv.set("trackRollData", true);
      await interaction.reply({
        content: `Successfully **enabled**: \`rollHistory\` and \`timesRolled\` statistics on player profiles`,
        ephemeral: true,
      });
    } else {
      if (!isRollDataTracked) {
        await interaction.reply({
          content: `Tracking \`rollHistory\` and \`timesRolled\` statistics on player profiles is already **disabled**`,
          ephemeral: true,
        });
        return;
      }
      await keyv.set("trackRollData", false);
      await interaction.reply({
        content: `Successfully **disabled**: \`rollHistory\` and \`timesRolled\` statistics on player profiles`,
        ephemeral: true,
      });
    }
  },
};
