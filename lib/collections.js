Games = new Mongo.Collection("games");
Players = new Mongo.Collection("players");
UserWords = new Mongo.Collection("userwords");
LanguagesUsed = new Mongo.Collection("languagesused");

Games.allow({
  insert: function (userId, doc) {
    return true;
  },
  update: function (userId, doc, fields, modifier) {
    return true;
  },
  remove: function (userId, doc) {
    return true;
  }
});

Players.allow({
  insert: function (userId, doc) {
    return true;
  },
  update: function (userId, doc, fields, modifier) {
    return true;
  },
  remove: function (userId, doc) {
    return true;
  }
});

UserWords.allow({
  insert: function (userId, doc) {
    return true;
  },
  update: function (userId, doc, fields, modifier) {
    return true;
  },
  remove: function (userId, doc) {
    return true;
  }
});

LanguagesUsed.allow({
  insert: function (userId, doc) {
    return true;
  },
  update: function (userId, doc, fields, modifier) {
    return true;
  },
  remove: function (userId, doc) {
    return true;
  }
});

Games.deny({insert: function(userId, game) {
  game.createdAt = new Date().valueOf();
  return false;
}});

Players.deny({insert: function(userId, player) {
  player.createdAt = new Date().valueOf();
  return false;
}});

UserWords.deny({insert: function(userId, userWord) {
  userWord.createdAt = new Date().valueOf();
  return false;
}});

LanguagesUsed.deny({insert: function(userId, languageUsed) {
  languageUsed.createdAt = new Date().valueOf();
  return false;
}});

