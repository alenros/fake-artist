Handlebars.registerHelper('toCapitalCase', function(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

function initUserLanguage() {
  let language = amplify.store("language");

  if (language){
    Session.set("language", language);
  }

  setUserLanguage(getUserLanguage());
}

function getUserLanguage() {
  let language = Session.get("language");

  if (language){
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

function getLanguageList() {
  let languages = TAPi18n.getLanguages();
  let languageList = _.map(languages, function(value, key) {
    let selected = "";
    
    if (key == getUserLanguage()){
      selected = "selected";
    }

    // Gujarati isn't handled automatically by tap-i18n,
    // so we need to set the language name manually
    if (value.name == "gu"){
        value.name = "ગુજરાતી";
    }

    return {
      code: key,
      selected: selected,
      languageDetails: value
    };
  });
  
  if (languageList.length <= 1){
    return null;
  }
  
  return languageList;
}

function getCurrentGame(){
  let gameID = Session.get("gameID");

  if (gameID) {
    return Games.findOne(gameID);
  }
}

function getAccessLink(){
  let game = getCurrentGame();

  if (!game){
    return;
  }

  return game.accessCode + "/";
}


function getCurrentPlayer(){
  let playerID = Session.get("playerID");

  if (playerID) {
    return Players.findOne(playerID);
  }
}

function generateAccessCode(){
    let code = getRandomWordAndCategory().text + "-" + getRandomWordAndCategory().text;

    return code;
}

function generateNewGame(){
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

function generateNewPlayer(game, name){
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

function getRandomWordAndCategory(){
  let words =[];
  
  //getWordsProvider();

  switch(getUserLanguage()) {
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

function resetUserState(){
  let player = getCurrentPlayer();

  if (player){
    Players.remove(player._id);
  }

  Session.set("gameID", null);
  Session.set("playerID", null);
}

function trackGameState () {
  let gameID = Session.get("gameID");
  let playerID = Session.get("playerID");

  if (!gameID || !playerID){
    return;
  }

  let game = Games.findOne(gameID);
  let player = Players.findOne(playerID);

  if (!game || !player){
    Session.set("gameID", null);
    Session.set("playerID", null);
    Session.set("currentView", "startMenu");
    return;
  }

  if(game.state === "inProgress"){
    Session.set("currentView", "gameView");
  } else if (game.state === "waitingForPlayers") {
    Session.set("currentView", "lobby");
  }
}

function leaveGame () {  
  let player = getCurrentPlayer();

  Session.set("currentView", "startMenu");
  Players.remove(player._id);

  Session.set("playerID", null);
}

function hasHistoryApi () {
  return !!(window.history && window.history.pushState);
}

initUserLanguage();

Meteor.setInterval(function () {
  Session.set('time', new Date());
}, 1000);

if (hasHistoryApi()){
  function trackUrlState () {
    let accessCode = null;
    let game = getCurrentGame();
    if (game){
      accessCode = game.accessCode;
    } else {
      accessCode = Session.get('urlAccessCode');
    }
    
    let currentURL = '/';
    if (accessCode){
      currentURL += accessCode+'/';
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
  whichView: function() {
    return Session.get('currentView');
  },
  language: function() {
    return getUserLanguage();
  },
  textDirection: function() {
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
  alternativeURL: function() {
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
    
    Meteor.subscribe('players', game._id, function onReady(){
      Session.set("loading", false);

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
  isLoading: function() {
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

    Meteor.subscribe('games', accessCode, function onReady(){
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
  isLoading: function() {
    return Session.get('loading');
  }
});


Template.joinGame.rendered = function (event) {
  resetUserState();

  let urlAccessCode = Session.get('urlAccessCode');

  if (urlAccessCode){
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

    let players = Players.find({'gameID': game._id}, {'sort': {'createdAt': 1}}).fetch();

    players.forEach(function(player){
      if (player._id === currentPlayer._id){
        player.isCurrent = true;
      }
    });

    return players;
  }
});



Template.lobby.events({
  'click .btn-leave': leaveGame,
	'click .btn-submit-user-word': function(event){
    let game = getCurrentGame();
    let word = document.getElementById("user-word").value;
    let category = document.getElementById("user-category").value;

    (function(name,path,ctx){ctx[name]=ctx[name]||{ready:function(fn){let h=document.getElementsByTagName('head')[0],s=document.createElement('script'),w=window,loaded;s.onload=s.onerror=s.onreadystatechange=function(){if((s.readyState&&!(/^c|loade/.test(s.readyState)))||loaded){return}s.onload=s.onreadystatechange=null;loaded=1;ctx[name].ready(fn)};s.async=1;s.src=path;h.parentNode.insertBefore(s,h)}}})
    ('KeenTracking', 'https://cdn.jsdelivr.net/npm/keen-tracking@4/dist/keen-tracking.min.js', this);
  
    KeenTracking.ready(function(){
      const client = new KeenTracking({
        projectId: '5c306025c9e77c00012189f5',
        writeKey: 'D69FDEF8CBAD4CFA6234A28102073F0D10A887D8AA9561290869E5C05C1C152CD2693229CBBBB72B137503AAF32715D3C418002C0B90432060DD63BA3B4FF3FC272E4F9FDCBA5E92CAA8BB37C99BDF99F0F3A6FE4CAF321C81590AC3AFBD182C'
      });
  
    client.recordEvent('user_words', {
        user_word: word,
        user_category: category
      });
    });

    let questionMasterId = $(event.currentTarget).data('player-id');
    let players = Array.from(Players.find({gameID: game._id},{_id:{$ne:questionMasterId}}));
    players = players.filter(p=>p._id != questionMasterId);
    let localEndTime = moment().add(game.lengthInMinutes, 'minutes');
    let gameEndTime = TimeSync.serverTime(localEndTime);
    
    let fakeArtistIndex = Math.floor(Math.random() * players.length);
    let firstPlayerIndex = Math.floor(Math.random() * players.length);

    players.forEach(function(player, index){
      console.log("updating " + player.name);
      Players.update(player._id, {$set: {
        isQuestionMaster: false,
        isFakeArtist: index === fakeArtistIndex,
        isFirstPlayer: index === firstPlayerIndex
      }});
    });

    Players.update(questionMasterId, {$set: {
      isQuestionMaster: true,
      isFakeArtist: false,
      isFirstPlayer: false
    }});

      players.forEach(function(player){
        Players.update(player._id, {$set: {category: category}});
      });

      Players.update(questionMasterId, {$set: {category: category}});

      let wordAndCategory = {
        text:word,category:category
      };
      Games.update(game._id, {$set: {state: 'inProgress', word: wordAndCategory, endTime: gameEndTime, paused: false, pausedTime: null}});
    },										  
  'click .btn-start': function () {

    let game = getCurrentGame();
    let wordAndCategory = getRandomWordAndCategory();
    let players = Players.find({gameID: game._id});
    let localEndTime = moment().add(game.lengthInMinutes, 'minutes');
    let gameEndTime = TimeSync.serverTime(localEndTime);

    let fakeArtistIndex = Math.floor(Math.random() * players.count());
    let firstPlayerIndex = Math.floor(Math.random() * players.count());

    players.forEach(function(player, index){
      Players.update(player._id, {$set: {
        isQuestionMaster: false,
        isFakeArtist: index === fakeArtistIndex,
        isFirstPlayer: index === firstPlayerIndex
      }});
    });

    players.forEach(function(player){
      Players.update(player._id, {$set: {category: wordAndCategory.category}});
    });

    Games.update(game._id, {$set: {state: 'inProgress', word: wordAndCategory, endTime: gameEndTime, paused: false, pausedTime: null}});
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
    // (function(name,path,ctx){ctx[name]=ctx[name]||{ready:function(fn){var h=document.getElementsByTagName('head')[0],s=document.createElement('script'),w=window,loaded;s.onload=s.onerror=s.onreadystatechange=function(){if((s.readyState&&!(/^c|loade/.test(s.readyState)))||loaded){return}s.onload=s.onreadystatechange=null;loaded=1;ctx[name].ready(fn)};s.async=1;s.src=path;h.parentNode.insertBefore(s,h)}}})
    // ('KeenTracking', 'https://cdn.jsdelivr.net/npm/keen-tracking@4/dist/keen-tracking.min.js', this);
  
    // KeenTracking.ready(function(){
    //   const client = new KeenTracking({
    //     projectId: '5c306025c9e77c00012189f5',
    //     writeKey: 'D69FDEF8CBAD4CFA6234A28102073F0D10A887D8AA9561290869E5C05C1C152CD2693229CBBBB72B137503AAF32715D3C418002C0B90432060DD63BA3B4FF3FC272E4F9FDCBA5E92CAA8BB37C99BDF99F0F3A6FE4CAF321C81590AC3AFBD182C'
    //   });
  
    // client.recordEvent('bad_categories', {
    //     user_word: game.wordAndCategory.text,
    //     user_category: game.wordAndCategory.category
    //   });
    // });
  },
  'click .btn-bad-word': function () {
    console.log('got a bad word');
    console.log('game.wordAndCategory.text');
    // (function(name,path,ctx){ctx[name]=ctx[name]||{ready:function(fn){var h=document.getElementsByTagName('head')[0],s=document.createElement('script'),w=window,loaded;s.onload=s.onerror=s.onreadystatechange=function(){if((s.readyState&&!(/^c|loade/.test(s.readyState)))||loaded){return}s.onload=s.onreadystatechange=null;loaded=1;ctx[name].ready(fn)};s.async=1;s.src=path;h.parentNode.insertBefore(s,h)}}})
    // ('KeenTracking', 'https://cdn.jsdelivr.net/npm/keen-tracking@4/dist/keen-tracking.min.js', this);
  
    // KeenTracking.ready(function(){
    //   const client = new KeenTracking({
    //     projectId: '5c306025c9e77c00012189f5',
    //     writeKey: 'D69FDEF8CBAD4CFA6234A28102073F0D10A887D8AA9561290869E5C05C1C152CD2693229CBBBB72B137503AAF32715D3C418002C0B90432060DD63BA3B4FF3FC272E4F9FDCBA5E92CAA8BB37C99BDF99F0F3A6FE4CAF321C81590AC3AFBD182C'
    //   });
  
    // client.recordEvent('bad_word', {
    //     user_word: game.wordAndCategory.text,
    //     user_category: game.wordAndCategory.category
    //   });
    // });
  }
});

Template.lobby.rendered = function (event) {
  let url = getAccessLink();
  url = "https://fake-artist.herokuapp.com/"+url;
  let qrcodesvg = new Qrcodesvg(url, "qrcode", 250);
  qrcodesvg.draw();
};

function getTimeRemaining(){
  let game = getCurrentGame();
  let localEndTime = game.endTime - TimeSync.serverOffset();

  if (game.paused){
    let localPausedTime = game.pausedTime - TimeSync.serverOffset();
    let timeRemaining = localEndTime - localPausedTime;
  } else {
    let timeRemaining = localEndTime - Session.get('time');
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
    
    if (!game){
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
    Games.update(game._id, {$set: {state: 'waitingForPlayers'}});
  },
  'click .btn-toggle-status': function () {
    $(".status-container-content").toggle();
  },
  'click .game-countdown': function () {
    let game = getCurrentGame();
    let currentServerTime = TimeSync.serverTime(moment());

    if(game.paused){
      let newEndTime = game.endTime - game.pausedTime + currentServerTime;
      Games.update(game._id, {$set: {paused: false, pausedTime: null, endTime: newEndTime}});
    } else {
      Games.update(game._id, {$set: {paused: true, pausedTime: currentServerTime}});
    }
  }
});
