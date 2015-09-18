# facebot

Facebot is a bot for Facebook messages. The idea was to emulate Slackbot.

Because Facebook doesn't expose any API's for chat, the bot runs in the browser,
directly modifying and sending messages through the DOM.

The Javascript code for the bot is currently injected into the page through a Google Chrome extension.

### Using it
The bot operates on the message thread currently open. Note that you have to be on the actual messages page (which is on the
left sidebar).
Once navigated to the page, the Google Chrome extension will automatically inject the bot.

#### GitHub Integration
In order to integate GitHub notifications, we need to run a separate server that
basically acts as a proxy. GitHub posts to the server when there's a change, and
the server then forwards the change to the Google Chrome extension via Pusher.

To add a repo:
1. Run `server/app.py` on a server somewhere
2. Add a GitHub hook to POST to `$YOUR_SERVER/git`

Everything should then work. Note that right now, the server just forwards
notifications to _all_ clients..

### Adding bot actions
To add new actions to the bot, add an action object of the form

`{ description: "A text description of the action", pattern: "A regex that denotes this action", action: some_method_to_call }`

to `client/facebot.js`. Then, define `some_method_to_call` to do whatever you want.

If you want to send a message as a response, you'll find `send_message` useful.
