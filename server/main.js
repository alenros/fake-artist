function cleanUpGamesAndPlayers(){
  let cutOff = moment().subtract(2, 'hours').toDate().getTime();

  Games.remove({
    createdAt: {$lt: cutOff}
  });

  Players.remove({
    createdAt: {$lt: cutOff}
  });
}

Meteor.startup(function () {
  // Delete all games and players at startup
  Games.remove({});
  Players.remove({});
});

let MyCron = new Cron(60000);

MyCron.addJob(5, cleanUpGamesAndPlayers);

Meteor.publish('games', function(accessCode) {
  return Games.find({"accessCode": accessCode});
});

Meteor.publish('players', function(gameID) {
  return Players.find({"gameID": gameID});
});