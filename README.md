# facebot

Facebot is a bot for Facebook messages. The idea was to emulate Slackbot.

Because Facebook doesn't expose any API's for chat, the bot runs in the browser,
directly modifying and sending messages through the DOM.

The Javascript code for the bot is currently injected into the page through a Google Chrome extension.

### Using it
The bot operates on the message thread currently open. Note that you have to be on the actual messages page (which is on the
left sidebar).
Once navigated to the page, the Google Chrome extension will automatically inject the bot.

### Adding bot actions
To add new actions to the bot, add an action object of the form

`{ description: "A text description of the action", pattern: "A regex that denotes this action", action: some_method_to_call }`

to `facebot.js`. Then, define `some_method_to_call` to do whatever you want.

If you want to send a message as a response, you'll find `send_message` useful.
