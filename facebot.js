console.log("Loaded injected facebot code")

var BOT_NAME = "Kevin Lin";

/*** Bot action definitions ***/
var bot_actions = [
{ description: "Get weather", pattern: /\/weather/, action: weather_function },
{ description: "Get time", pattern: /\/time/,    action: time_function },
{ description: "Echo back the message", pattern: /\/echo/,    action: echo_function },
{ description: "Laugh", pattern: /\/laugh (\d*)/,    action: laugh_function },
{ description: "Display help", pattern: /\/help/, action: help_function },
];

function laugh_function(message) {
  var num_laughs = parseInt(/\/laugh (\d*)/.exec(message.message)[1]);
  var ret = "";
  for (var i=0 ; i<num_laughs ; i++) {
    ret += "ha";
  }
  send_message("How funny: " + ret);
}

function echo_function(message) {
  send_message("You said: " + /\/echo (.*)/.exec(message.message)[1]); 
}

function weather_function(message) {
  var loc = /\/weather (.*)/.exec(message.message)[1]; // TODO: we shouldn't have to manually parse out the command invocation
  $.ajax(
          { url: "https://api.wunderground.com/api/a03b82e84fcc85b1/geolookup/conditions/q/" + loc + ".json",
            success: function(weather) {
                if (weather['location'] != undefined) {
                    // TODO: handle locations outside of the US
                    send_message("Temperature in " + weather['location']['city'] + ", " + weather['location']['state'] + " is currently " + weather['current_observation']['temp_f']);
                } else {
                    send_message("Error retrieving weather for " + loc + ". Maybe you should change the location string.");
                }
            }
      }
  );
}

function time_function(message) {
  send_message("It is now " + Date());
}

function help_function(message) {
  send_message("These are the available functions");
  for (var i = 0 ; i<bot_actions.length ; i++) {
    send_message(bot_actions[i].description + ": " + bot_actions[i].pattern);
  }
}

/*** Bot utility functions ***/

var chat_box = document.querySelector("[name=message_body]");
var send_button = document.querySelector("#u_0_r");
function send_message(message) {
  chat_box.classList.remove("DOMControl_placeholder");
  chat_box.value = message;
  send_button.click();
}

var parse_messages = function(message) {
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
var process = function(new_messages) {
  for (var i=0 ; i<new_messages.length ; i++) {
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

var processed_messages = [];
var check_for_updates = function() {
  var messages_raw = document.querySelectorAll(".webMessengerMessageGroup");
  processed_messages_new = [];
  var new_messages = [];
  for (var i=0 ; i<messages_raw.length ; i++) {
    var messages = parse_messages(messages_raw[i]);
    for (var j=0 ; j<messages.length ; j++) {
        processed_messages_new.push(messages[j]);
        var processed = _.findIndex(processed_messages, messages[j]); // this is so slow:  we should be taking advantage of the fact that the arrays are sorted (or use MutationObserver better)
        if (processed == -1 && processed_messages.length != 0) {
          new_messages.push(messages[j]);
        }
        // console.log("Got a message at " + messages[j].timestamp + " from " + messages[j].from + ":");
        // console.log(messages[j].message);
    }
  }
  processed_messages = processed_messages_new;
  return new_messages;
}

var observer = new MutationObserver(function(mutations) { 
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length != 0) {
        var new_messages = check_for_updates();
        process(new_messages);
      }
    });
});

var config = { childList: true };

var messagesContainer = document.querySelector("#webMessengerRecentMessages");
// pass in the target node, as well as the observer options
observer.observe(messagesContainer, config);
