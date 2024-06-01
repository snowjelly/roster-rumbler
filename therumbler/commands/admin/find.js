const { SlashCommandBuilder } = require("discord.js");
const database = require("../../database");
const logger = require("../../logger");
const { stripIndents, oneLineCommaLists } = require("common-tags");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("find")
    .setDescription("ADMIN: find a players profile")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to get the profile of")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    const user = interaction.options.getUser("target");
    const result = await database.findMemberDocument(user.username, user.id);
    await interaction.reply({
      content: stripIndents`**User ${user}'s Info:** 

      \`${
        result.startggUser.registeredInEvent
          ? `They are registered`
          : `They are not registered`
      }\`
      Their tournament name is: \`${result.startggUser.entrantName}\`
      ${oneLineCommaLists`Their DLC: \`${result.dlcFighters}`}\`
      `,
      ephemeral: true,
    });
  },
};
