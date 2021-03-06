var BOT_NAME = "Jarvis Lin"; // TODO: put into some config file
var ATTACHED_CONVERSATION = getConversationName(); // TODO: can we make this variable final?
var GIPHY_API_KEY = 'dc6zaTOxFJmzC';

// State handling {{{
// For persisting state between page loads
// TODO: make state auto-save when changed
var state = null;
var query = {};
query[ATTACHED_CONVERSATION] = { todo: [], points: {} }
chrome.storage.sync.get(query, function(result) { 
  state = result[ATTACHED_CONVERSATION]; 
});

function saveState() {
  var to_save = {}
  to_save[ATTACHED_CONVERSATION] = state;
  chrome.storage.sync.set(to_save, function() {
      console.log("Successfully saved the bot state");
  });
}
// }}}

// Push notifications {{{
// Setup Git notifications
var pusher = new Pusher('00db2f5136ce6619a03c');
var git_channel = pusher.subscribe('git_notifications');

git_channel.bind('push', function(push){
    if (getConversationName() == ATTACHED_CONVERSATION) {
      send_message(push.user + " pushed to " + push.repo + ": " + push.message, false);
    }
});

// }}}

// Bot action definitions {{{
var bot_actions = [
{ description: "Get weather", pattern: /^\/weather (.+)/, action: weather_function },
{ description: "Get time", pattern: /^\/time/,    action: time_function },
{ description: "Echo back the message", pattern: /^\/echo/,    action: echo_function },
{ description: "Laugh", pattern: /^\/laugh (\d+)/,    action: laugh_function },
{ description: "Display help", pattern: /^\/help/, action: help_function },
{ description: "Display conversation currently in", pattern: /^\/convo_name/, action: conversation_name_function },
{ description: "Say hi", pattern: /^\/hello/, action: hello_function },
{ description: "Add to TODO list", pattern: /^\/add todo (.+)/, action: add_todo_function },
{ description: "Print TODO list", pattern: /^\/list todo/, action: print_todo_function },
{ description: "Remove from TODO list", pattern: /^\/remove todo (\d+)/, action: remove_todo_function },
{ description: "Get a random gif", pattern: /^\/giphy/, action: giphy_function },
{ description: "Get the most relevant wikipedia page", pattern: /^\/wiki/, action: wiki_function },
{ description: "Google authorize", pattern: /^\/gauth/, action: google_authorize_function },
{ description: "Show calendar", pattern: /^\/calendar/, action: show_calendar_function },
{ description: "Increment points", pattern: /^(.*)\+\+/, action: increment_points_function },
{ description: "Decrement points", pattern: /^(.*)--/, action: decrement_points_function },
{ description: "List all points", pattern: /^\/points/, action: list_points_function },
];

// Google integration {{{

var CLIENT_ID = '260256874992-kg364rgkcsv54lggdo95fp9kksr5peur.apps.googleusercontent.com';

var SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

function gapiLoaded() {
  console.log("GAPI loaded");
}

// TODO: need to make sure gapi client has finished loading first
function google_authorize_function(message) {
  console.log(gapi);
  gapi.auth.authorize(
   {client_id: CLIENT_ID, scope: SCOPES, immediate: false},
   function(authResult) {
     if (authResult && !authResult.error) {
       send_message("Successfully authorized!");
     } else {
       send_message("Something went wrong while authorizing..");
     }
   });
}

function show_calendar_function(message) {
  var gapi_key = 'AIzaSyCzGVMAAfbZpYOwmT7ObGc_Zvk1uKTU5wo'; // typically like Gtg-rtZdsreUr_fLfhgPfgff
  gapi.client.setApiKey(gapi_key);
  var who = /^\/calendar (.+)/.exec(message.message)[1];
  gapi.client.load('calendar', 'v3', function() {
    var request = gapi.client.calendar.events.list({
      'calendarId': who,
      'timeMin': (new Date()).toISOString(),
      'showDeleted': false,
      'singleEvents': true,
      'maxResults': 10,
      'orderBy': 'startTime'
    });

    request.execute(function(resp) {
      var events = resp.items;
      var msg = "Upcoming events:\n";

      if (events.length > 0) {
        for (i = 0; i < events.length; i++) {
          var event = events[i];
          var when = event.start.dateTime;
          if (!when) {
            when = event.start.date;
          }
          msg += event.summary + ' (' + when + ')\n'
        }
      } else {
        var msg = 'No upcoming events found.';
      }
      send_message(msg, false);

    });       
  });
}

// }}}

// Brownie points {{{
// TODO: fix pluraity of messages
function increment_points_function(message) {
  var who = /^(.*)\+\+/.exec(message.message)[1];
  if (state.points == undefined) {
    state.points = {};
  }
  if (who in state.points) {
    state.points[who]++;
  } else {
    state.points[who] = 1;
  }
  saveState();
  send_message(">>> " + who + " now has " + state.points[who] + " points.", false);
}

function decrement_points_function(message) {
  var who = /^(.*)--/.exec(message.message)[1];
  if (state.points == undefined) {
    state.points = {};
  }
  if (who in state.points) {
    state.points[who]--;
  } else {
    state.points[who] = -1;
  }
  saveState();
  send_message(">>> " + who + " now has " + state.points[who] + " points.", false);
}

function list_points_function(message) {
  var ret = "";
  for (var who in state.points) {
    if (state.points.hasOwnProperty(who)) {
      ret += ">>> " + who + " has " + state.points[who] + " points.\n";
    }
  }
  send_message(ret, false);
}

// }}}

// TODO: refactor API calls to use data parameter instead of building link
function wiki_function(message) {
  // TODO: if no search term provided, just pick a random picture
  var search_term = /^\/wiki (.+)/.exec(message.message)[1];
  var search_term_encoded = encodeURI(search_term);
  $.ajax(
          { url: "https://en.wikipedia.org/w/api.php?action=opensearch&search=" + search_term_encoded + "&limit=1&namespace=0&format=json",
            headers: { 'Api-User-Agent': 'Example/1.0' },
            success: function(result) {
                send_message(result[2] + "\n" + result[3], true);
            }
      }
  );
}

function giphy_function(message) {
  // TODO: if no search term provided, just pick a random picture
  var search_term = /^\/giphy (.+)/.exec(message.message)[1];
  var search_term_encoded = encodeURI(search_term);
  $.ajax(
          { url: "https://api.giphy.com/v1/gifs/random?tag=" + search_term_encoded + "&api_key=" + GIPHY_API_KEY,
            success: function(result) {
                send_message(result.data.image_original_url, true);
            }
      }
  );
}

function add_todo_function(message) {
  var todo = /^\/add todo (.*)/.exec(message.message)[1];
  state.todo.push({item: todo,
                   user: message.from});
  // send_message("Added the TODO", false);
  saveState();
}

function remove_todo_function(message) {
  var todo = /^\/remove todo (\d+)/.exec(message.message)[1];
  todo = parseInt(todo);
  if (state.todo[todo].user != message.from) {
    send_message("Error: only " + state.todo[todo].user + " can remove this TODO.", false);
  } else {
    state.todo.splice(todo, 1);
    saveState();
  }
}

function print_todo_function(message) {
  for (var i = 0 ; i<state.todo.length ; i++) {
    send_message(i + ": " + state.todo[i].user + " needs to: " + state.todo[i].item, false);
  }
}

function hello_function(message) {
  send_message("Hello " + message.from, false);
}

function laugh_function(message) {
  var num_laughs = parseInt(/\/laugh (\d*)/.exec(message.message)[1]);
  if (num_laughs > 50) {
    send_message("No.", false);
    return;
  }
  var ret = "";
  for (var i=0 ; i<num_laughs ; i++) {
    ret += "ha";
  }
  send_message("How funny: " + ret, false);
}

function echo_function(message) {
  send_message("You said: " + /\/echo (.*)/.exec(message.message)[1], false); 
}

function weather_function(message) {
  var loc = /\/weather (.*)/.exec(message.message)[1]; // TODO: we shouldn't have to manually parse out the command invocation
  $.ajax(
          { url: "https://api.wunderground.com/api/a03b82e84fcc85b1/geolookup/conditions/q/" + loc + ".json",
            success: function(weather) {
                if (weather['location'] != undefined) {
                    // TODO: handle locations outside of the US
                    send_message("Temperature in " + weather['location']['city'] + ", " + weather['location']['state'] + " is currently " + weather['current_observation']['temp_f'], false);
                } else {
                    send_message("Error retrieving weather for " + loc + ". Maybe you should change the location string.", false);
                }
            }
      }
  );
}

function time_function(message) {
  send_message("It is now " + Date(), false);
}

// TODO: send one message with new lines instead of separate messages
function help_function(message) {
  var msg = "These are the available functions\n"
  for (var i = 0 ; i<bot_actions.length ; i++) {
    msg += bot_actions[i].description + ": " + bot_actions[i].pattern + "\n";
  }
  send_message(msg, false);
}

function conversation_name_function(message) {
  send_message("In conversation with \"" + getConversationName() + "\"", false);
}

// }}}

// Bot utility functions {{{
// Stuff that is used for bot actions

function getConversationName() {
  var url = window.location.href;
  var matches = /https:\/\/www\.facebook\.com\/messages\/(.*)/.exec(url);
  return matches[1];
}

var chat_box = document.querySelector("[name=message_body]");
// TODO: this selector breaks when there's multiple buttons (like if there's a popup box)
var send_button = document.querySelector("#u_0_r");
function send_message(message, delay) {
  chat_box.classList.remove("DOMControl_placeholder");
  chat_box.value = message;

  // make Facebook create thumbnails for images
  var event = new CustomEvent("paste"); 
  chat_box.dispatchEvent(event);

  if (delay) {
    setTimeout(function(){ // give Facebook time to process the potential thumbnail
        send_button.click();
    }, 2000);
  } else {
    send_button.click();
  }
}

/* }}} */

// Main processing logic for new messages {{{
// TODO: make the bot ignore the message if it's coming from itself

function parse_messages(message) {
  var timestamp = message.querySelector("._ohf abbr").textContent;
  var from = message.querySelector("._36 a").textContent;
  var message_elems = message.querySelectorAll("._3hi");
  var messages = [];
  for (var i = 0 ; i < message_elems.length ; i++) {
    messages.push( { 'timestamp': timestamp,
                     'from'     : from,
                     'message' : message_elems[i].textContent });
  }
  return messages;
}

// the main processing loop
function process(new_messages) {
  for (var i=0 ; i<new_messages.length ; i++) {
    // ignore the messages that we send
    if (new_messages[i].from == BOT_NAME) {
      continue;
    }
    console.log("Got a message at " + new_messages[i].timestamp + " from " + new_messages[i].from + ":");
    console.log(new_messages[i].message);
    for (var j=0 ; j<bot_actions.length ; j++) {
      if (bot_actions[j].pattern.exec(new_messages[i].message)) {
        console.log("Matched the pattern for: " + bot_actions[j].description);
        bot_actions[j].action(new_messages[i]); 
      }
    }
  }
}

var newest_messages = null;
function determineNew(nodes) {
  // Don't process messages when you switch conversations
  if (getConversationName() != ATTACHED_CONVERSATION) {
    return [];
  }
  var added_node = nodes[nodes.length-1]; // assumes that the new message is always in the last changed node
  var messages = parse_messages(added_node);

  // our first time running:  we're parsing all the old messages
  if (newest_messages == null) {
    newest_messages = messages;
    return [];
  }

  // TODO: this algorithm will break if you switch conversations, let
  // messages accumulate in the other conversation, and then switch back
  
  // Find the first index that messages and newest_messages differs
  var j=0;
  for (var i=0 ; i<messages.length ; i++) {
    var message = messages[i];
    if (j < newest_messages.length && _.isEqual(message, newest_messages[j])) {
      j++;
    } else {
      break;
    }
  }

  var new_messages = [];
  for (var i=j ; i<messages.length ; i++) {
    new_messages.push(messages[i]);
  }

  // prep for next time
  newest_messages = messages;
  return new_messages;
}

var observer = new MutationObserver(function(mutations) { 
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length != 0) {
        // var new_messages = check_for_updates();
        var new_messages = determineNew(mutation.addedNodes);
        process(new_messages);
      }
    });
});

// }}}

// Load the Google API
var script = document.createElement('script');
script.src = 'https://apis.google.com/js/client.js';
document.head.appendChild(script);

// start the processing logic
var config = { childList: true };
var messagesContainer = document.querySelector("#webMessengerRecentMessages");
observer.observe(messagesContainer, config);
console.log("Loaded injected facebot code")
