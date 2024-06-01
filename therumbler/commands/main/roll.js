const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const database = require("../../database");
const Keyv = require("keyv");
const mongo_uri = require("../../mongo_uri");
const keyv = new Keyv(`${mongo_uri}/keyv`);
const logger = require("../../logger");
const { stripIndents } = require("common-tags");

function getRandomCharacter(dlcRollDataArr) {
  const randNum = Math.floor(Math.random() * dlcRollDataArr.length);
  return dlcRollDataArr[randNum];
}

async function getDuration() {
  const defaultDuration = 0;
  const duration = await keyv.get("rollDuration");
  if (duration) {
    return duration;
  }
  return defaultDuration;
}

module.exports = {
  cooldown: getDuration(),
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("roll for a character"),
  async execute(interaction) {
    const userData = await database.findMemberDocument(
      interaction.user.username,
      interaction.user.id
    );
    const fighterStorage = await database.fightersCollection.findOne({
      _id: 1,
    });
    const dlcArr = userData.dlcFighters;
    const baseArr = fighterStorage.base;
    let combinedArray;
    if (dlcArr.length > 0) {
      const dlcRollData = database.getDlcRollData(dlcArr, fighterStorage);
      combinedArray = baseArr.concat(dlcRollData);
    } else {
      combinedArray = baseArr;
    }

    const character = getRandomCharacter(combinedArray);

    const funnyImageWinter =
      "https://1000logos.net/wp-content/uploads/2023/05/Laughing-Emoji.png";
    const funnyImageJestipo =
      "https://ih1.redbubble.net/image.330968397.4018/flat,750x,075,f-pad,750x1000,f8f8f8.u1.jpg";
    const funnyImages = [funnyImageJestipo, funnyImageWinter];

    const laughAtEm = new EmbedBuilder()
      .setColor(0x0099ff)
      .setImage(funnyImages[Math.floor(Math.random() * 2)]);

    const { user } = interaction;

    //laugh at them. wait 2 seconds. show result;
    const lastRoll = await keyv.get(`${interaction.user.id}_lastRoll`);
    const reroll = await keyv.get(`${interaction.user.id}_reroll`);

    let dupe = false;
    if (lastRoll === character.alt) {
      dupe = true;
    }

    const isRollDataTracked = false;
    // await keyv.get("trackRollData");
    let lastRollData = null;
    if (isRollDataTracked) {
      lastRollData = await database.trackRollData(
        interaction,
        character,
        isRollDataTracked
      );
    }

    function getRollEmbed() {
      if (isRollDataTracked) {
        let footerText;
        if (!lastRollData) {
          footerText = `This is your first time rolling this character`;
        } else {
          footerText = stripIndents`You last rolled ${character.alt} ${lastRollData.lastTimeRolled}
      You have rolled them ${lastRollData.charTimesRolled} times
      `;
        }
        return new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`${character.alt} (Click here to learn more!)`)
          .setURL(
            `https://dustloop.com/w/GGST/${character.alt.replace(" ", "_")}`
          )
          .setImage(character.portrait.img)
          .setFooter({ text: footerText });
      }
      return new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`${character.alt} (Click here to learn more!)`)
        .setURL(
          `https://dustloop.com/w/GGST/${character.alt.replace(" ", "_")}`
        )
        .setImage(character.portrait.img);
    }

    const rollEmbed = getRollEmbed();

    if (dupe) {
      await wait(2_000);
      await interaction.reply({
        embeds: [laughAtEm],
      });
      await wait(1_000);
      await interaction.followUp({
        content: `${user} rolled ${character.alt}!`,
        embeds: [rollEmbed],
      });
      await keyv.set(`${interaction.user.id}_reroll`, true, 120_000);
    } else if (reroll === true) {
      await interaction.reply({
        content: `${user} rolled ${lastRoll} into ${character.alt}`,
        embeds: [rollEmbed],
      });
      await keyv.set(`${interaction.user.id}_reroll`, false);
    } else {
      await interaction.reply({
        content: `${user} rolled ${character.alt}!`,
        embeds: [rollEmbed],
      });
      await keyv.set(`${interaction.user.id}_reroll`, true, 120_000);
    }

    await keyv.set(`${interaction.user.id}_lastRoll`, character.alt, 300_000);
  },
};
