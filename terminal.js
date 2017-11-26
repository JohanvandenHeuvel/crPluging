// if user is running mozilla then use it's built-in WebSocket
window.WebSocket = window.WebSocket || window.MozWebSocket;
window.Connection = null;

function connectToWebServer(){
  var connection = new WebSocket("ws://" + location.host + "/");

  connection.sendObj = function(obj) {
	this.send(JSON.stringify(obj));
  }
  
  connection.onopen = function () {
	window.Connection.sendObj({type: "state", value: 500});
	// connection is opened and ready to use
  };

  connection.onerror = function (error) {
	// an error occurred when sending/receiving data
  };

  connection.onmessage = function (message) {
	// try to decode json (I assume that each message
	// from server is json)
	try {
	  var obj = JSON.parse(message.data);
	} catch (e) {
	  console.log('This doesn\'t look like a valid JSON: ', message.data);
	  //return;
	}
	
	switch(obj.type){
		case "result":
			plot(obj.value);
		break;
		default:
			console.warning(obj.type + " not recognized.");
	}
	// handle incoming message
  };
  
  window.Connection = connection;
  
}

function plot(data) {
	
	var data = [
	  {
		x: ['Faster', 'Slower', 'Repeat', 'Example', 'Downvote', 'Upvote', 'Silence!'],
		y: data,
		type: 'bar'
	  }
	];

	Plotly.newPlot(document.getElementById("tester"), data);
}