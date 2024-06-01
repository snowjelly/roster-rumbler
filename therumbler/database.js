const { MongoClient } = require("mongodb");
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);

const uri = require("./mongo_uri");
const logger = require("./logger");

const client = new MongoClient(uri);
const dbname = "rumble";
const collection_name = "members";

const membersCollection = client.db(dbname).collection(collection_name);
const fightersCollection = client.db(dbname).collection("fighters");
const tournamentsCollection = client.db(dbname).collection("tournaments");
const secretsCollection = client.db(dbname).collection("secrets");

const Keyv = require("keyv");
const mongo_uri = require("./mongo_uri");
const keyvMongo = new Keyv(`${mongo_uri}/keyv`);

const connectToDatabase = async () => {
  try {
    await client.connect();
    console.log(`Connected to the ${dbname} database`);
  } catch (err) {
    console.error(`Error connecting to the database: ${err}`);
  }
};

async function getToken() {
  try {
    const result = await tournamentsCollection.findOne({ _id: "whynot" });
    return result.token;
  } catch (err) {
    logger.error(err);
  }
}

function getStartggOauthSecrets() {
  return secretsCollection.findOne({ _id: "startggOauth" });
}

async function getDiscordSecrets() {
  return {
    clientId: await keyvMongo.get("clientId"),
    guildId: await keyvMongo.get("guildId"),
    token: await keyvMongo.get("token"),
  };
}
function getDlcRollData(userDlcFighters, globalDlcFighters) {
  const rollData = [];
  globalDlcFighters.dlc.forEach((dlc) => {
    userDlcFighters.forEach((dlcFighter) => {
      if (dlc.alt === dlcFighter) rollData.push(dlc);
    });
  });
  return rollData;
}

async function setActiveEvent(eventId) {
  await keyvMongo.set("activeEvent", eventId);
}

function getEventSlug(link) {
  const regex = /^tournament\/([^\/]+)\/event\/([^\/]+[^\/])$/;
  const tournamentIndex = link.indexOf("tournament");
  const eventIndex = link.indexOf("event/");
  let tournamentSubstr = link.substr(tournamentIndex, eventIndex - 1);
  if (tournamentIndex < 21) {
    tournamentSubstr = link.substr(tournamentIndex);
  }
  if (tournamentSubstr.charAt(tournamentSubstr.length - 1) === "/") {
    tournamentSubstr = tournamentSubstr.substr(0, tournamentSubstr.length - 1);
  }

  if (regex.test(tournamentSubstr)) {
    return tournamentSubstr;
  }
  return false;
}

async function updateTournamentData(eventSlug) {
  const token = await getToken();
  const { data } = await getTournamentInfo(token, eventSlug);
  const result = await tournamentsCollection.findOneAndReplace(
    {
      "data.event.id": data.event.id,
    },
    { data },
    { returnDocument: "after" }
  );
  console.log(result);
}

async function addTournamentToCollection(eventSlug) {
  const token = await getToken();
  const { data } = await getTournamentInfo(token, eventSlug);

  try {
    const result = await tournamentsCollection.findOne({
      "data.event.id": data.event.id,
    });
    if (result !== null) {
      return result;
    }
    await tournamentsCollection.insertOne({ data });
    return tournamentsCollection.findOne({
      "data.event.id": data.event.id,
    });
  } catch (err) {
    logger.error(err);
  }
}

async function reset() {
  const str = '"characters';
  const result = await membersCollection.findOneAndUpdate(
    { discordUsername: ".leafmealone" },
    {
      $set: {
        characters: {},
      },
      $unset: {
        [str]: "",
      },
    },
    { returnDocument: "after" }
  );
  console.log(result);
}

async function getUserStats(discordUsername) {
  const result = await membersCollection.findOne(
    { discordUsername },
    {
      projection: {
        rollHistory: 0,
        startggOauthToken: 0,
      },
    }
  );
  console.log(result);
}

const main = async () => {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
};

async function generateMemberDocument(name, id) {
  const result = await membersCollection.insertOne({
    discordUsername: name,
    discordId: id,
    startggUser: {},
    dlcFighters: [],
    characters: {},
    rollHistory: [],
  });
  logger.info({ generateMember: result });
  return result;
}

async function deleteMemberDocument(name, id) {
  const result = await membersCollection.findOneAndDelete({
    discordUsername: name,
    discordId: id,
  });
  logger.info({ deleteMember: result });
  return result;
}

async function findMemberDocument(name, id) {
  const result = await membersCollection.findOne(
    {
      discordUsername: name,
      discordId: id,
    },
    {
      projection: {
        "startggUser.entrantName": 1,
        _id: 0,
        "startggUser.registeredInEvent": 1,
        dlcFighters: 1,
      },
    }
  );
  return result;
}

async function findCharacterData() {
  const result = await fightersCollection.findOne({ _id: 1 });
  console.log(result);
}

async function trackRollData(interaction, character, trackData) {
  if (!trackData) return;

  function getFormattedCharacterName() {
    let characterName = character.alt.toLowerCase();
    characterName = characterName.replace(/[. ?♯]/g, "").replace(/[- ]/g, "");
    const formattedCharacterName =
      "characters." + characterName + ".timesRolled";
    return { formattedCharacterName, characterName };
  }

  // i can add this to the roll modal. showing the date they last rolled this character
  // also showing how often they have rolled them
  let findUserDocument = await membersCollection.findOne(
    {
      discordUsername: interaction.user.username,
      discordId: interaction.user.id,
    },
    {
      projection: {
        rollHistory: 1,
        [getFormattedCharacterName().formattedCharacterName]: 1,
      },
    }
  );
  const { rollHistory } = findUserDocument;

  function getLastTimeRolledThisCharacter() {
    for (let i = rollHistory.length - 1; i > 0; i -= 1) {
      if (rollHistory[i].fighter === character.alt) {
        return rollHistory[i];
      }
    }
    return false;
  }
  const incrementTimesRolled = await membersCollection.findOneAndUpdate(
    {
      discordUsername: interaction.user.username,
    },
    {
      $inc: {
        [getFormattedCharacterName()]: 1,
      },
    },
    { returnDocument: "after" }
  );

  findUserDocument = await membersCollection.findOne(
    {
      discordUsername: interaction.user.username,
      discordId: interaction.user.id,
    },
    {
      projection: {
        rollHistory: 1,
        [getFormattedCharacterName().formattedCharacterName]: 1,
      },
    }
  );

  const pushRollHistory = await membersCollection.findOneAndUpdate(
    {
      discordUsername: interaction.user.username,
    },
    {
      $push: {
        rollHistory: {
          fighter: character.alt,
          timestamp: new Date(),
        },
      },
    }
  );
  if (!getLastTimeRolledThisCharacter()) {
    return false;
  }

  const lastTimeRolled = dayjs(
    getLastTimeRolledThisCharacter().timestamp
  ).fromNow();
  const charTimesRolled =
    findUserDocument.characters[getFormattedCharacterName().characterName]
      .timesRolled;

  const lastRollData = {
    lastTimeRolled,
    charTimesRolled,
  };

  return lastRollData;
}

module.exports = {
  membersCollection,
  connectToDatabase,
  client,
  fightersCollection,
  generateMemberDocument,
  deleteMemberDocument,
  findMemberDocument,
  getToken,
  addTournamentToCollection,
  setActiveEvent,
  getEventSlug,
  getDiscordSecrets,
  getStartggOauthSecrets,
  getDlcRollData,
  trackRollData,
};
