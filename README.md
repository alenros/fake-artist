[![Build status](https://ci.appveyor.com/api/projects/status/307724t5l4nahrm7?svg=true)](https://ci.appveyor.com/project/alenros/fake-artist)

# A Fake Artist Goes to New York
![Logo](public/img/logo-en.png)

This player aid for A Fake Artist Goes to New York eliminates the need for a Question master and lets everyone participate.

This code powers https://fake-artist.herokuapp.com - where you can play the game.

It is based on [Evan Brumley's](https://github.com/evanbrumley) Spyfall game.

The original boardgame at BoardGameGeek: https://boardgamegeek.com/boardgame/135779/fake-artist-goes-new-york


# Running Your Copy
Feel free to contact me if you want help running your own instance. I have more detailed explnation of how to deploy the app in the works.

First step - clone this repo.

Install Meteor by running:
`curl https://install.meteor.com/ | sh`

Set the following to workaround the expired Meteor SSL certificate:
`export NODE_TLS_REJECT_UNAUTHORIZED=0`

If you want to use your own MongoDB set environment variable:
`export DB_URI=mongodb+srv://your_mongo_instance`

Set the URL of your applciation:
`export ROOT_URL=https://your-url.com`

And finally run the following in the directory you have clone the repository: 
`meteor`

# Translation
The translation has two parts: the user interface and the words list.
The words lists are in the \lib\ directory. to add a new wordlist you should add it in main.js in the getRandomWordAndCategory();
The UI translations are in the \i18n\ directory. To add a new UI translation simply copy the English (en.i18n.json), rename the file prefix with the language code you want to translate
and change the translated strings on the right side.


# Credits
I can code but can't draw, so all the art of the game come from the artists of [The Noun Project](https://thenounproject.com/)
Art by Will Deskins from the Noun Project
Fake Mustache by Claire Jones from the Noun Project
Salvador Dali by Simon Child from the Noun Project

Translators:
* [Johannes Fischer](https://github.com/JohannesFischer)
* [Raphael Alexio](https://github.com/raphaelaleixo)
* [Francesco T](https://www.boardgamegeek.com/user/omnigod)
