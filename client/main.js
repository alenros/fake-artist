Handlebars.registerHelper('toCapitalCase', function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

function initUserLanguage() {
  let language = amplify.store("language");

  if (language) {
    Session.set("language", language);
  }
  let userLanguage = getUserLanguage()
  setUserLanguage(userLanguage);
}

function getUserLanguage() {
  let language = Session.get("language");

  if (language) {
    return language;
  } else {
    // select browser language if supported
    let browserLanguage = window.navigator.userLanguage || window.navigator.language;
    let supportedLanguages = TAPi18n.getLanguages();

    if (supportedLanguages[browserLanguage]) {
      return browserLanguage;
    }
    return "en";
  }
};

function setUserLanguage(language) {
  TAPi18n.setLanguage(language).done(function () {
    Session.set("language", language);
    amplify.store("language", language);
  });
}

function getLanguageDirection() {
  let language = getUserLanguage()
  let rtlLanguages = ['he', 'ar'];

  if ($.inArray(language, rtlLanguages) !== -1) {
    return 'rtl';
  } else {
    return 'ltr';
  }
}

function getRandomSubset(collection, n) {
  if (n > collection.length) {
    return [];
  }
  const newCollection = collection.map((i) => i);
  for (let i = 0; i <= (n - 1); i += 1) {
    const newIndex = Math.floor(Math.random() * newCollection.length);
    const temp = newCollection[newIndex];
    newCollection[newIndex] = newCollection[i];
    newCollection[i] = temp;
  }

  newCollection.splice(n, newCollection.length);
  return newCollection;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getLanguageList() {
  let languages = TAPi18n.getLanguages();
  let languageList = _.map(languages, function (value, key) {
    let selected = "";

    if (key == getUserLanguage()) {
      selected = "selected";
    }

    // Gujarati isn't handled automatically by tap-i18n,
    // so we need to set the language name manually
    if (value.name == "gu") {
      value.name = "ગુજરાતી";
    }

    return {
      code: key,
      selected: selected,
      languageDetails: value
    };
  });

  if (languageList.length <= 1) {
    return null;
  }

  return languageList;
}

function getCurrentGame() {
  let gameID = Session.get("gameID");

  if (gameID) {
    return Games.findOne(gameID);
  }
}

function getAccessLink() {
  let game = getCurrentGame();

  if (!game) {
    return;
  }

  return game.accessCode + "/";
}

function getCurrentPlayer() {
  let playerID = Session.get("playerID");

  if (playerID) {
    return Players.findOne(playerID);
  }
}

function generateAccessCode() {
  let accessCodeLength = 5;
  let accessCode = "";

  for (var i = 0; i < accessCodeLength; i++) {
    let randomDigit = Math.floor(Math.random() * 10);
    accessCode = accessCode + randomDigit;
  }

  return accessCode;
}

function generateNewGame() {
  let game = {
    accessCode: generateAccessCode(),
    state: "waitingForPlayers",
    word: null,
    lengthInMinutes: 10,
    endTime: null,
    paused: false,
    pausedTime: null
  };

  let gameID = Games.insert(game);
  game = Games.findOne(gameID);

  return game;
}

function generateNewPlayer(game, name) {
  let player = {
    gameID: game._id,
    name: name,
    category: null,
    isQuestionMaster: false,
    isFakeArtist: false,
    isFirstPlayer: false
  };

  let playerID = Players.insert(player);

  return Players.findOne(playerID);
}

function getWordsProvider() {
  let words = [];

  switch (getUserLanguage()) {
    case "he":
      words = words_he;
      break;
    case "en":
      words = words_en;
      break;
    case "de":
      words = words_de;
      break;
    case "it":
      words = words_it;
      break;
    case "es":
      words = words_es;
      break;
    case "fr":
      words = words_fr;
      break;
    default:
      words = words_en;
      break;
  }

  let minimumWordsInCategory = 10;

  let excludedCategories = [];


  let filteredWords = words.filter(word => !excludedCategories.includes(word.category.toLowerCase()));

  let categoryToOccurences = {};

  filteredWords.forEach(word => {
    let wordOccurence = categoryToOccurences[word.category];
    if (wordOccurence === undefined) {
      wordOccurence = 1;
    }
    else {
      wordOccurence = wordOccurence + 1;
    }
    categoryToOccurences[word.category] = wordOccurence;
  });

  filteredWords = filteredWords.filter(word => categoryToOccurences[word.category] >= minimumWordsInCategory);

  return filteredWords;
}

function getRandomWordAndCategory(categoriesList) {
  // heh, this should be optimized better.
  let filteredWords = getWordsProvider().filter(word => categoriesList.includes(word.category));
  if (categoriesList.length === 0) {
    filteredWords = getWordsProvider();
  }
  let wordIndex = Math.floor(Math.random() * filteredWords.length);

  return filteredWords[wordIndex];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function resetUserState() {
  let player = getCurrentPlayer();

  if (player) {
    Players.remove(player._id);
  }

  Session.set("gameID", null);
  Session.set("playerID", null);
}

function trackGameState() {
  let gameID = Session.get("gameID");
  let playerID = Session.get("playerID");

  if (!gameID || !playerID) {
    return;
  }

  let game = Games.findOne(gameID);
  let player = Players.findOne(playerID);

  if (!game || !player) {
    Session.set("gameID", null);
    Session.set("playerID", null);
    Session.set("currentView", "startMenu");
    return;
  }

  if (game.state === "inProgress") {
    Session.set("currentView", "gameView");
  } else if (game.state === "waitingForPlayers") {
    Session.set("currentView", "lobby");
  }
}

function leaveGame() {
  let player = getCurrentPlayer();

  let game = getCurrentGame();
  let currentTimeRemaining = getTimeRemaining();
  let players = Array.from(Players.find({ gameID: game._id }));

  let gameAnalytics = {
    gameID: game._id,
    playerCount: players.length,
    timeLeft: currentTimeRemaining / 1000 / 60,
    status: 'left game',
  };

  Analytics.insert(gameAnalytics);

  Session.set("currentView", "startMenu");
  Players.remove(player._id);

  Session.set("playerID", null);
}

function hasHistoryApi() {
  return !!(window.history && window.history.pushState);
}

initUserLanguage();

Meteor.setInterval(() => {
  Session.set('time', new Date());
}, 1000);

if (hasHistoryApi()) {
  function trackUrlState() {
    let accessCode = null;
    let game = getCurrentGame();
    if (game) {
      accessCode = game.accessCode;
    } else {
      accessCode = Session.get('urlAccessCode');
    }

    let currentURL = '/';
    if (accessCode) {
      currentURL += `${accessCode}/`;
    }
    window.history.pushState(null, null, currentURL);
  }
  Tracker.autorun(trackUrlState);
}
Tracker.autorun(trackGameState);

FlashMessages.configure({
  autoHide: true,
  autoScroll: false
});

Template.main.helpers({
  whichView() {
    return Session.get('currentView');
  },
  language() {
    return getUserLanguage();
  },
  textDirection() {
    return getLanguageDirection();
  },
});

Template.footer.helpers({
  languages: getLanguageList
});

Template.footer.events({
  'click .btn-set-language': function (event) {
    let language = $(event.target).data('language');
    setUserLanguage(language);
  },
  'change .language-select': function (event) {
    let language = event.target.value;
    setUserLanguage(language);
  }
});

Template.startMenu.events({
  'click #btn-new-game': function () {
    Session.set("currentView", "createGame");
    let referrer = document.referrer;
    let referrerAnalytics = {
      cameFrom: referrer,
      action: "New Game"
    };

    Analytics.insert(referrerAnalytics);
  },
  'click #btn-join-game': function () {
    let referrer = document.referrer;
    let referrerAnalytics = {
      cameFrom: referrer,
      action: "Join Game",
    };

    Analytics.insert(referrerAnalytics);

    Session.set("currentView", "joinGame");
  }
});

Template.startMenu.helpers({
  alternativeURL() {
    return Meteor.settings.public.alternative;
  }
});

Template.startMenu.rendered = function () {
  let referrer = document.referrer;
  let referrerAnalytics = {
    cameFrom: referrer,
    action: "Start Page"
  };
  Analytics.insert(referrerAnalytics);
  resetUserState();
};

Template.createGame.events({
  'submit #create-game': function (event) {

    let playerName = event.target.playerName.value;

    if (!playerName) {
      return false;
    }

    let game = generateNewGame();
    let player = generateNewPlayer(game, playerName);

    Meteor.subscribe('games', game.accessCode);

    Session.set("loading", true);

    Meteor.subscribe('players', game._id, function onReady() {
      Session.set("loading", false);
      Session.set("language", getUserLanguage());
      Session.set("gameID", game._id);
      Session.set("playerID", player._id);
      Session.set("currentView", "lobby");
    });

    return false;
  },
  'click .btn-back': function () {
    Session.set("currentView", "startMenu");
    return false;
  }
});

Template.createGame.helpers({
  isLoading: function () {
    return Session.get('loading');
  }
});

Template.createGame.rendered = function (event) {
  $("#player-name").focus();
};

Template.joinGame.events({
  'submit #join-game': function (event) {
    let accessCode = event.target.accessCode.value;
    let playerName = event.target.playerName.value;

    if (!playerName) {
      return false;
    }

    accessCode = accessCode.trim();
    accessCode = accessCode.toLowerCase();

    Session.set("loading", true);

    Meteor.subscribe('games', accessCode, function onReady() {
      Session.set("loading", false);

      let game = Games.findOne({
        accessCode: accessCode
      });

      if (game) {
        Meteor.subscribe('players', game._id);
        let player = generateNewPlayer(game, playerName);

        let referrer = document.referrer;
        let referrerAnalytics = {
          cameFrom: referrer,
          action: "Join Game",
        };

        Analytics.insert(referrerAnalytics);
        Session.set('urlAccessCode', null);
        Session.set("gameID", game._id);
        Session.set("playerID", player._id);
        Session.set("currentView", "lobby");
      } else {
        FlashMessages.sendError(TAPi18n.__("ui.invalid access code"));
      }
    });

    return false;
  },
  'click .btn-back': function () {
    Session.set('urlAccessCode', null);
    Session.set("currentView", "startMenu");
    return false;
  }
});

Template.joinGame.helpers({
  isLoading: function () {
    return Session.get('loading');
  }
});


Template.joinGame.rendered = function (event) {
  resetUserState();

  let referrer = document.referrer;
  let referrerAnalytics = {
    cameFrom: referrer,
    action: "Join Game",
  };

  Analytics.insert(referrerAnalytics);

  let urlAccessCode = Session.get('urlAccessCode');

  if (urlAccessCode) {
    $("#access-code").val(urlAccessCode);
    $("#access-code").hide();
    $("#player-name").focus();
  } else {
    $("#access-code").focus();
  }
};

Template.lobby.helpers({
  game: function () {
    return getCurrentGame();
  },
  accessLink: function () {
    return Meteor.absoluteUrl() + getAccessLink();
  },
  player: function () {
    return getCurrentPlayer();
  },
  categories: function () {
    let words = getWordsProvider();
    const uniqueCategories = [...new Set(words.map(word => word.category))];
    // sort alphabetically by category
    uniqueCategories.sort((a, b) => a.localeCompare(b));
    const categories = uniqueCategories.map((category) => {
      let categorySelected = amplify.store(category);
      if (categorySelected === undefined) {
        categorySelected = true;
      }
      return { text: category, selected: categorySelected };
    });

    return categories;
  },
  players: function () {
    let game = getCurrentGame();
    let currentPlayer = getCurrentPlayer();

    if (!game) {
      return null;
    }

    let players = Players.find({ 'gameID': game._id }, { 'sort': { 'createdAt': 1 } }).fetch();

    players.forEach(function (player) {
      if (player._id === currentPlayer._id) {
        player.isCurrent = true;
      }
    });

    return players;
  }
});

Template.lobby.events({
  'click .btn-leave': leaveGame,
  'click .btn-toggle-category-select': function () {
    $(".category-select").toggle();
  },
  'click .btn-submit-user-word': function (event) {
    let game = getCurrentGame();
    let word = document.getElementById("user-word").value;
    let category = document.getElementById("user-category").value;
    if (word.length == 0 || category.length == 0) {
      return;
    }
    // Track words submittd by users
    let userWord = {
      word: word,
      category: category,
      language: Session.get("language")
    };

    let questionMasterId = $(event.currentTarget).data('player-id');
    let currentPlayers = Array.from(Players.find({ gameID: game._id }, { _id: { $ne: questionMasterId } }));
    let regularPlayers = currentPlayers.filter(player => player._id != questionMasterId);

    let localEndTime = moment().add(game.lengthInMinutes, 'minutes');
    let gameEndTime = TimeSync.serverTime(localEndTime);

    let fakeArtistIndex = Math.floor(Math.random() * regularPlayers.length);
    let firstPlayerIndex = Math.floor(Math.random() * regularPlayers.length);

    let turnOrders = []

    UserWords.insert(userWord);

    regularPlayers.forEach(function (player, index) {
      turnOrders.push(index + 1);
    });

    turnOrders = shuffle(turnOrders);

    regularPlayers.forEach(function (player, index) {
      Players.update(player._id, {
        $set: {
          isQuestionMaster: false,
          isFakeArtist: index === fakeArtistIndex,
          isFirstPlayer: index === firstPlayerIndex,
          turnOrder: turnOrders[index]
        }
      });
    });

    // All Fake Artist Variant
    let shouldPlayAllFakeArtistsVariant = document.getElementById("use-all-fake-artists-variant").checked;

    let percentEveryoneIsAFakeArtist = 10;
    let isEveryoneAFakeArtist = Math.floor(Math.random() * 100) < percentEveryoneIsAFakeArtist;

    let isAllFakeArtistsVariantActive = shouldPlayAllFakeArtistsVariant && isEveryoneAFakeArtist;
    if (isAllFakeArtistsVariantActive) {
      currentPlayers.forEach((player) => {
        if (player.isQuestionMaster === false) {
          Players.update(player._id, {
            $set: {
              isFakeArtist: true,
            }
          });
        }
      });
    }
    // All Fake Artists variant ends

    // No Fake Artist Variant
    const shouldPlayNoFakeArtistsVariant = document.getElementById('use-no-fake-artist-variant').checked;

    const percentNoFakeArtist = 10;
    const isNoFakeArtist = Math.floor(Math.random() * 100) < percentNoFakeArtist;

    let isNoFakeArtistsVariantActive = shouldPlayNoFakeArtistsVariant && isNoFakeArtist;
    if (isNoFakeArtistsVariantActive) {
      currentPlayers.forEach((player) => {
        if (player.isQuestionMaster === false) {
          Players.update(player._id, {
            $set: {
              isFakeArtist: false,
            },
          });
        }
      });
    }
    // No Fake Artist Variant ends
    const variantsUsed = [];
    if (shouldPlayNoFakeArtistsVariant === true) {
      variantsUsed.push('no fake-artist');
    }

    if (shouldPlayAllFakeArtistsVariant === true) {
      variantsUsed.push('all fake-artists');
    }

    const shouldPlayLessFirstFakeArtistsVariant = document.getElementById('use-less-first-fake-artist-variant').checked;

    if (shouldPlayLessFirstFakeArtistsVariant
      && !isAllFakeArtistsVariantActive
      && !isNoFakeArtistsVariantActive) {
      if (firstPlayerIndex === fakeArtistIndex) {
        const percentFakeArtistisFirst = 10;
        const isFakeArtistStillFirst = Math.floor(Math.random() * 100) < percentFakeArtistisFirst;

        if (!isFakeArtistStillFirst) {
          const otherPlayers = regularPlayers.map((player) => player);

          otherPlayers.splice(fakeArtistIndex, 1);

          const newFirstPlayer = getRandomSubset(otherPlayers, 1)[0];

          const nonFirstPlayers = regularPlayers.filter((player) => player._id != newFirstPlayer._id);

          // Shuffle
          const playersByTurnOrder = getRandomSubset(nonFirstPlayers, nonFirstPlayers.length);

          // insert newFirstPlayer at start
          playersByTurnOrder.splice(0, 0, newFirstPlayer);

          playersByTurnOrder.forEach((player, index) => {
            Players.update(player._id, {
              $set: {
                isFirstPlayer: index === 0,
                turnOrder: index + 1,
              },
            });
          });
        }
      }
    }

    if (shouldPlayLessFirstFakeArtistsVariant === true) {
      variantsUsed.push('less first');
    }

    Players.update(questionMasterId, {
      $set: {
        isQuestionMaster: true,
        isFakeArtist: false,
        isFirstPlayer: false,
      }
    });

    currentPlayers.forEach((player) => {
      Players.update(player._id, { $set: { category } });
    });

    Players.update(questionMasterId, { $set: { category: category } });

    let wordAndCategory = {
      text: word, category: category
    };

    let gameAnalytics = {
      gameID: game._id,
      playerCount: currentPlayers.length,
      gameType: "user-word",
      language: Session.get("language"),
      variants: variantsUsed,
      word: word,
    };

    Analytics.insert(gameAnalytics);

    Games.update(game._id, { $set: { state: 'inProgress', word: wordAndCategory, endTime: gameEndTime, paused: false, pausedTime: null, usingAllFakeArtistsVariant: shouldPlayNoFakeArtistsVariant, usingNoFakeArist: shouldPlayNoFakeArtistsVariant, isAllConfusedArtistsVariantActive: false } });
  },
  'click .btn-start': function () {

    let game = getCurrentGame();
    let categoriesList = document.querySelectorAll('input[name="category-name"]');
    categoriesList.forEach((category) => {
      amplify.store(category.value, category.checked);
    });

    categoriesList = Array.from(categoriesList).filter((category) => category.checked).map((category) => category.value);
    let wordAndCategory = getRandomWordAndCategory(categoriesList);

    let currentPlayers = Array.from(Players.find({ gameID: game._id }));
    let localEndTime = moment().add(game.lengthInMinutes, 'minutes');
    let gameEndTime = TimeSync.serverTime(localEndTime);

    let fakeArtistIndex = Math.floor(Math.random() * currentPlayers.length);
    let firstPlayerIndex = Math.floor(Math.random() * currentPlayers.length);

    let turnOrders = []

    let i = 0;
    while (turnOrders.length < currentPlayers.length) {
      turnOrders.push(i);
      i = i + 1;
    }

    turnOrders = shuffle(turnOrders);

    currentPlayers.forEach((player, index) => {
      Players.update(player._id, {
        $set: {
          isQuestionMaster: false,
          isFakeArtist: index === fakeArtistIndex,
          isFirstPlayer: index === firstPlayerIndex,
          turnOrder: turnOrders[index] + 1,
        }
      });
    });

    currentPlayers.forEach((player) => {
      Players.update(player._id, { $set: { category: wordAndCategory.category } });
    });

    // All Fake Artist Variant
    let shouldPlayAllFakeArtistsVariant = document.getElementById("use-all-fake-artists-variant").checked;

    let percentEveryoneIsAFakeArtist = 10;
    let isEveryoneAFakeArtist = Math.floor(Math.random() * 100) < percentEveryoneIsAFakeArtist;
    let isAllFakeArtistsVariantActive = shouldPlayAllFakeArtistsVariant && isEveryoneAFakeArtist;

    if (isAllFakeArtistsVariantActive) {
      currentPlayers.forEach((player) => {
        if (player.isQuestionMaster == false) {
          Players.update(player._id, {
            $set: {
              isFakeArtist: true,
            }
          });
        }
      });
    }
    // All Fake Artists variant ends

    // No Fake Artist Variant
    let shouldPlayNoFakeArtistsVariant = document.getElementById("use-no-fake-artist-variant").checked;

    let percentNoFakeArtist = 10;
    let isNoFakeArtist = Math.floor(Math.random() * 100) < percentNoFakeArtist;
    let isNoFakeArtistsVariantActive = shouldPlayNoFakeArtistsVariant && isNoFakeArtist;

    if (isNoFakeArtistsVariantActive) {
      currentPlayers.forEach((player) => {
        if (player.isQuestionMaster == false) {
          Players.update(player._id, {
            $set: {
              isFakeArtist: false,
            }
          });
        }
      });
    }
    // No Fake Artist Variant ends

    // All Confused Artist Variant
    let shouldPlayAllConfusedArtistsVariant = document.getElementById("use-confused-artist-variant").checked;
    let isAllConfusedArtistsVariantActive = shouldPlayAllConfusedArtistsVariant && !isAllFakeArtistsVariantActive && !isNoFakeArtistsVariantActive;
    if (isAllConfusedArtistsVariantActive) {
      let otherWordSameCategory = getRandomWordAndCategory([wordAndCategory.category]);
      while (wordAndCategory.text === otherWordSameCategory.text) {
        // ASSUMES that there are at least 2 words in the category
        // else this will be an infinite loop
        otherWordSameCategory = getRandomWordAndCategory([wordAndCategory.category]);
      }
      // update fake artist's word
      Players.update(currentPlayers[fakeArtistIndex]._id, {
        $set: {
          word: otherWordSameCategory.text,
        },
      });
    }

    // All Confused Artists variant ends

    // Fake Artist Less First variant
    let shouldPlayLessFirstFakeArtistsVariant = document.getElementById('use-less-first-fake-artist-variant').checked;

    if (shouldPlayLessFirstFakeArtistsVariant && !isAllFakeArtistsVariantActive && !isNoFakeArtistsVariantActive) {
      if (firstPlayerIndex === fakeArtistIndex) {
        let percentFakeArtistisFirst = 10;
        let isFakeArtistStillFirst = Math.floor(Math.random() * 100) < percentFakeArtistisFirst;

        if (!isFakeArtistStillFirst) {
          const otherPlayers = currentPlayers.map((player) => player);

          otherPlayers.splice(fakeArtistIndex, 1);

          const newFirstPlayer = getRandomSubset(otherPlayers, 1)[0];

          const nonFirstPlayers = currentPlayers.filter((player) => player._id != newFirstPlayer._id);

          // Shuffle
          const playersByTurnOrder = getRandomSubset(nonFirstPlayers, nonFirstPlayers.length);

          // insert newFirstPlayer at start
          playersByTurnOrder.splice(0, 0, newFirstPlayer);

          playersByTurnOrder.forEach((player, index) => {
            Players.update(player._id, {
              $set: {
                isFirstPlayer: index === 0,
                turnOrder: index + 1,
              },
            });
          });
        }
      }
    }
    // Fake Artist Less First variant ends

    const variantsUsed = [];
    if (shouldPlayNoFakeArtistsVariant === true) {
      variantsUsed.push('no fake-artist');
    }
    if (shouldPlayAllFakeArtistsVariant === true) {
      variantsUsed.push('all fake-artists');
    }
    if (shouldPlayLessFirstFakeArtistsVariant === true) {
      variantsUsed.push('less first');
    }

    // Track game analytics
    let gameAnalytics = {
      gameID: game._id,
      playerCount: currentPlayers.length,
      gameType: "game-word",
      language: Session.get("language"),
      languageType: "Chosen",
      variants: variantsUsed
    };

    Analytics.insert(gameAnalytics);

    Games.update(game._id, {
      $set: {
        state: 'inProgress',
        word: wordAndCategory,
        endTime: gameEndTime,
        paused: false,
        pausedTime: null,
        isAllConfusedArtistsVariantActive: isAllConfusedArtistsVariantActive,
      },
    });
  },
  'click #copyAccessLinkImg': function () {
    const accessLink = `${Meteor.absoluteUrl()}${getAccessLink()}`;

    const textArea = document.createElement("textarea");
    textArea.value = accessLink;
    document.body.appendChild(textArea);
    textArea.select();

    document.execCommand("copy");
    document.body.removeChild(textArea);

    let tooltip = document.getElementById("copyAccessLinkTooltip");

    tooltip.innerHTML = TAPi18n.__("ui.copied");
  },
  'mouseout #copyAccessLinkImg': function () {
    let tooltip = document.getElementById("copyAccessLinkTooltip");

    tooltip.innerHTML = TAPi18n.__("ui.copy access link");;
  },
  'click .btn-toggle-qrcode': function () {
    $(".qrcode-container").toggle();
  },
  'click .btn-remove-player': function (event) {
    let playerID = $(event.currentTarget).data('player-id');
    Players.remove(playerID);
  },
  'click .btn-edit-player': function (event) {
    let game = getCurrentGame();
    resetUserState();
    Session.set('urlAccessCode', game.accessCode);
    Session.set('currentView', 'joinGame');
  },
  'click .btn-bad-category': function () {
    console.log('got a bad category');
    console.log('game.wordAndCategory.category');
  },
  'click .btn-bad-word': function () {
    console.log('got a bad word');
    console.log('game.wordAndCategory.text');
  }
});

Template.lobby.rendered = function (event) {
  let url = getAccessLink();
  url = `${Meteor.absoluteUrl()}${url}`;
  const qrcodesvg = new Qrcodesvg(url, 'qrcode', 250);
  qrcodesvg.draw();
};

function getTimeRemaining() {
  let game = getCurrentGame();
  let localEndTime = game.endTime - TimeSync.serverOffset();
  let timeRemaining;
  if (game.paused) {
    let localPausedTime = game.pausedTime - TimeSync.serverOffset();
    timeRemaining = localEndTime - localPausedTime;
  } else {
    timeRemaining = localEndTime - Session.get('time');
  }

  if (timeRemaining < 0) {
    timeRemaining = 0;
  }

  return timeRemaining;
}

Template.gameView.helpers({
  game: getCurrentGame,
  player: getCurrentPlayer,
  players() {
    const game = getCurrentGame();

    if (!game) {
      return null;
    }

    let players = Players.find({
      'gameID': game._id
    });

    return players;
  },
  words() {
    return words_en;
  },
  gameFinished() {
    const timeRemaining = getTimeRemaining();

    return timeRemaining === 0;
  },
  timeRemaining() {
    const timeRemaining = getTimeRemaining();

    return moment(timeRemaining).format('mm[<span>:</span>]ss');
  }
});

Template.gameView.events({
  'click .btn-leave': leaveGame,
  'click .btn-end': function () {
    let game = getCurrentGame();
    Games.update(game._id, { $set: { state: 'waitingForPlayers' } });

    let currentTimeRemaining = getTimeRemaining();

    let players = Array.from(Players.find({ gameID: game._id }));

    let gameAnalytics = {
      gameID: game._id,
      playerCount: players.length,
      timeLeft: currentTimeRemaining / 1000 / 60,
      status: 'game ended',
    };

    Analytics.insert(gameAnalytics);
  },
  'click .btn-toggle-status': function () {
    $(".status-container-content").toggle();
  },
  'click .game-countdown': function () {
    let game = getCurrentGame();
    let currentServerTime = TimeSync.serverTime(moment());

    if (game.paused) {
      let newEndTime = game.endTime - game.pausedTime + currentServerTime;
      Games.update(game._id, { $set: { paused: false, pausedTime: null, endTime: newEndTime } });
    } else {
      Games.update(game._id, { $set: { paused: true, pausedTime: currentServerTime } });
    }
  }
});
