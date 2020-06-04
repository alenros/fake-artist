import posthog from 'posthog-js';
posthog.init("LCy-zU8gQrMp8K75jpj3a89xC7to5FEZwQ_pUI1743U", { api_host: 'https://analytics-fake-artist.herokuapp.com' });

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

  // Track the language used for the game
  let languageUsed = {
    language: userLanguage,
    languageType: "Browser",
  };

  LanguagesUsed.insert(languageUsed);
}

function getUserLanguage() {
  let language = Session.get("language");

  if (language) {
    return language;
  } else {
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

function getRandomWordAndCategory() {
  let words = [];

  // var lang = Session.get("language");

  switch (getUserLanguage()) {
    case "he":
      words = words_he;
      break;
    case "en":
      words = words_en;
      break;
    default:
      words = words_en;
      break;
  };

  let wordIndex = Math.floor(Math.random() * words.length);

  return words[wordIndex];
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

  Session.set("currentView", "startMenu");
  Players.remove(player._id);

  Session.set("playerID", null);
}

function hasHistoryApi() {
  return !!(window.history && window.history.pushState);
}

initUserLanguage();

Meteor.setInterval(function () {
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
      currentURL += accessCode + '/';
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
  whichView: function () {
    return Session.get('currentView');
  },
  language: function () {
    return getUserLanguage();
  },
  textDirection: function () {
    return getLanguageDirection();
  }
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
  },
  'click #btn-join-game': function () {
    Session.set("currentView", "joinGame");
  }
});

Template.startMenu.helpers({
  alternativeURL: function () {
    return Meteor.settings.public.alternative;
  }
});

Template.startMenu.rendered = function () {
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
    return getAccessLink();
  },
  player: function () {
    return getCurrentPlayer();
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
    let players = Array.from(Players.find({ gameID: game._id }, { _id: { $ne: questionMasterId } }));
    let regularPlayers = players.filter(player => player._id != questionMasterId);

    let localEndTime = moment().add(game.lengthInMinutes, 'minutes');
    let gameEndTime = TimeSync.serverTime(localEndTime);

    let fakeArtistIndex = Math.floor(Math.random() * regularPlayers.length);
    let firstPlayerIndex = Math.floor(Math.random() * regularPlayers.length);

    let turnOrders = []

    UserWords.insert(userWord);

    // Track the language used for the game
    let languageUsed = {
      gameID: game._id,
      language: Session.get("language"),
      playerCount: players.length,
      languageType: "Chosen",
    };

    LanguagesUsed.insert(languageUsed);

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

    Players.update(questionMasterId, {
      $set: {
        isQuestionMaster: true,
        isFakeArtist: false,
        isFirstPlayer: false,
      }
    });

    players.forEach(function (player) {
      Players.update(player._id, { $set: { category: category } });
    });

    Players.update(questionMasterId, { $set: { category: category } });

    let wordAndCategory = {
      text: word, category: category
    };
    Games.update(game._id, { $set: { state: 'inProgress', word: wordAndCategory, endTime: gameEndTime, paused: false, pausedTime: null } });
  },
  'click .btn-start': function () {

    let game = getCurrentGame();
    let wordAndCategory = getRandomWordAndCategory();

    let players = Players.find({ gameID: game._id });
    let localEndTime = moment().add(game.lengthInMinutes, 'minutes');
    let gameEndTime = TimeSync.serverTime(localEndTime);

    let fakeArtistIndex = Math.floor(Math.random() * players.count());
    let firstPlayerIndex = Math.floor(Math.random() * players.count());

    // Track the language used for the game
    let languageUsed = {
      gameID: game._id,
      language: Session.get("language"),
      playerCount: players.count()
    };

    LanguagesUsed.insert(languageUsed);

    let turnOrders = []

    let i = 0;
    while (turnOrders.length < players.count()) {
      turnOrders.push(i);
      i = i + 1;
    }

    turnOrders = shuffle(turnOrders);

    players.forEach(function (player, index) {
      Players.update(player._id, {
        $set: {
          isQuestionMaster: false,
          isFakeArtist: index === fakeArtistIndex,
          isFirstPlayer: index === firstPlayerIndex,
          turnOrder: turnOrders[index] + 1,
        }
      });
    });

    players.forEach(function (player) {
      Players.update(player._id, { $set: { category: wordAndCategory.category } });
    });

    Games.update(game._id, { $set: { state: 'inProgress', word: wordAndCategory, endTime: gameEndTime, paused: false, pausedTime: null } });
  },
  'click #copyAccessLinkImg': function () {
    console.log("copying");
    let accessLink = "https://fake-artist.herokuapp.com/" + getAccessLink();

    const textArea = document.createElement("textarea");
    textArea.value = accessLink;
    document.body.appendChild(textArea);
    textArea.select();

    document.execCommand("copy");
    document.body.removeChild(textArea);

    var tooltip = document.getElementById("copyAccessLinkTooltip");
    tooltip.innerHTML = "Copied!";
  },
  'mouseout #copyAccessLinkImg': function () {
    var tooltip = document.getElementById("copyAccessLinkTooltip");
    // TODO revert the text using the translated string
    // tooltip.innerHTML = "Copy link";
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
  url = "https://fake-artist.herokuapp.com/" + url;
  let qrcodesvg = new Qrcodesvg(url, "qrcode", 250);
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
  players: function () {
    let game = getCurrentGame();

    if (!game) {
      return null;
    }

    let players = Players.find({
      'gameID': game._id
    });

    return players;
  },
  words: function () {
    return words_en;
  },
  gameFinished: function () {
    let timeRemaining = getTimeRemaining();

    return timeRemaining === 0;
  },
  timeRemaining: function () {
    let timeRemaining = getTimeRemaining();

    return moment(timeRemaining).format('mm[<span>:</span>]ss');
  }
});

Template.gameView.events({
  'click .btn-leave': leaveGame,
  'click .btn-end': function () {
    let game = getCurrentGame();
    Games.update(game._id, { $set: { state: 'waitingForPlayers' } });
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
