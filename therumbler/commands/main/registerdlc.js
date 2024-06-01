const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const database = require("../../database");

async function getStringSelectMenu(interaction, setDisabled) {
  const characters = await database.fightersCollection.findOne({
    _id: 1,
  });
  const options = await striveCharacterSelectionBuilder(
    interaction.user.username,
    characters
  );
  async function striveCharacterSelectionOptionBuilder(
    char,
    interactionUsername
  ) {
    const result = await database.membersCollection.findOne({
      discordUsername: interactionUsername,
      dlcFighters: { $all: [`${char.alt}`] },
    });
    if (result !== null) {
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${char.alt}`)
        .setValue(`${char.alt}`)
        .setDefault(true);
    }
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${char.alt}`)
      .setValue(`${char.alt}`);
  }

  async function striveCharacterSelectionBuilder(
    interactionUsername,
    characters
  ) {
    const optionsArr = [];
    for (let i = 0; i < characters.dlc.length; i += 1) {
      optionsArr.push(
        await striveCharacterSelectionOptionBuilder(
          characters.dlc[i],
          interactionUsername
        )
      );
    }
    return optionsArr;
  }
  if (setDisabled === "disabled") {
    const select = new StringSelectMenuBuilder()
      .setCustomId("dlc")
      .setPlaceholder("Add or remove DLC's from the bot's random pool")
      .setMinValues(0)
      .setMaxValues(characters.dlc.length)
      .addOptions(options)
      .setDisabled(true);

    return new ActionRowBuilder().addComponents(select);
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId("dlc")
    .setPlaceholder("Add or remove DLC's from the bot's random pool")
    .setMinValues(0)
    .setMaxValues(characters.dlc.length)
    .addOptions(options);

  return new ActionRowBuilder().addComponents(select);
}

module.exports = {
  cooldown: 120,
  data: new SlashCommandBuilder()
    .setName("registerdlc")
    .setDescription(
      `Add or remove DLCs from the bot's random pool. I can't stop you from cheating. Keep it fun, yea?`
    ),
  async execute(interaction) {
    interaction.deferReply();
  },
  getStringSelectMenu,
};
