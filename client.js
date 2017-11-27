// if user is running mozilla then use it's built-in WebSocket
window.WebSocket = window.WebSocket || window.MozWebSocket;
window.Connection = null;

function connectToWebServer() {
  var connection = new WebSocket("ws://" + location.host + "/");

  connection.sendObj = function(obj) {
    this.send(JSON.stringify(obj));
  }

  connection.onopen = function() {
    // connection is opened and ready to use
  };

  connection.onerror = function(error) {
    // an error occurred when sending/receiving data
  };

  connection.onmessage = function(message) {
    // try to decode json (I assume that each message
    // from server is json)
    try {
      var json = JSON.parse(message.data);
    } catch (e) {
      console.log('This doesn\'t look like a valid JSON: ',
        message.data);
      return;
    }
    console.log(JSON.stringify(json));
    switch (json.type) {
      case 'reactivate':
        document.getElementById(valueToId[json.value]).canVote = true;
        document.getElementById(valueToId[json.value]).style.background = "rgba(0, 0, 0, 0)";
        break;
    }
    // handle incoming message
  };

  window.Connection = connection;
}

var valueToId = ['faster', 'slower', 'repeat', 'example', 'downvote', 'upvote', 'silent'];
var idToValue = {
  "faster": 0,
  "slower": 1,
  "repeat": 2,
  "example": 3,
  "downvote": 4,
  "upvote": 5,
  "silent": 6
};

var maxVotes = 3;

function tapVote(e) {
  if (this.id == 'downvote') {
    this.style.background = 'rgba(255, 0, 0, 0)';
    document.getElementById('upvote').style.background = 'rgba(255, 0, 0, 0.5)';
  }
  if (this.id == 'upvote') {
    this.style.background = 'rgba(255, 0, 0, 0)';
    document.getElementById('downvote').style.background = 'rgba(255, 0, 0, 0.5)';
  }
  if (!this.canVote)
    return;
  this.canVote = false;
  window.Connection.sendObj({
    type: 'vote',
    value: this.value
  });
  this.decaySize = Math.max(0, this.decaySize - 1 / maxVotes);
  this.style.background = "rgba(255, 0, 0, 0.5)";
  window.navigator.vibrate([20]);
  e.target.style.paddingLeft = e.target.style.paddingTop = "5px";
}

function makeButtonInteractive(id, inactiveMin) {
  var el = document.getElementById(id);
  el.value = idToValue[id];
  el.decaySize = 1;
  el.canVote = true;
  el.virtualTap = tapVote;
  el.addEventListener("touchstart", tapVote, false);
  el.addEventListener("touchend", function(e) {
    e.target.style.paddingLeft = e.target.style.paddingTop = "0";
  }, false);
}

function main() {
  connectToWebServer();

  makeButtonInteractive('faster', 15);
  makeButtonInteractive('slower', 15);
  makeButtonInteractive('repeat', 2);
  makeButtonInteractive('example', 2);
  makeButtonInteractive('downvote', 999);
  makeButtonInteractive('upvote', 999);
  makeButtonInteractive('silent', 5);
}
