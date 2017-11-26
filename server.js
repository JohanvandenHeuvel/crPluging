var WebSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');

var phone_html = null;
var terminal_html = null;
var client_js = null;
var terminal_js = null;

var imgpaths = ['back.png', 'down.png', 'for.png', 'search.png', 'undo.png', 'up.png', 'shush.png'];
var imgs = [null, null, null, null, null, null];

function loadimg(path){
	fs.readFile('./' + path, function (err, img) {
		if (err)
			console.log(err);
		else
			imgs[imgpaths.indexOf(path)] = img;
	});
}

for(var imit = 0; imit < imgpaths.length; imit++){
	loadimg(imgpaths[imit]);
}

fs.readFile('./client.html', function (err, html) {
    if (err)
        console.log(err); 
	else
		phone_html = html;
	
});
fs.readFile('./terminal.html', function (err, html) {
    if (err) {
        console.log(err); 
    }
	else
		terminal_html = html;
	
});
fs.readFile('./client.js', function (err, js) {
    if (err) {
        console.log(err); 
    }
	else
		client_js = js;
	
});
fs.readFile('./terminal.js', function (err, js) {
    if (err) {
        console.log(err); 
    }
	else
		terminal_js = js;
	
});

var server = http.createServer(function(req, response) {  
	var html = phone_html;
	if(req.url == "/terminal" || req.url == "/terminal.html")
		html = terminal_html;
	else if (req.url == "/client.js")
		html = client_js;
	else if (req.url == "/terminal.js")
		html = terminal_js;
	else {
		imit = imgs.length;
		while(imit--){
			if(req.url.substring(1, req.url.length) == imgpaths[imit]){
				response.writeHeader(200, {"Content-Type": "image/png"});
				response.end(imgs[imit], 'binary');
				return;
			}
		}
	}
	
	response.writeHeader(200, {"Content-Type": "text/html"});
	
	if(html == null){
		console.error("File requested but not loaded! url: " + req.url);
		response.write("File not found!");
	}
	else
		response.write(html);  
	response.end();  
});
server.listen(80, function() { });

// create the server
wsServer = new WebSocketServer({
  httpServer: server
});

var classes = 7;
var connections = [];
var clients = [];
var votes = [];
var stationary = [];
var decay = [0.03, 0.03, 0.03, 0.03, 0, 0, 0.03];

function decayVote(index){
	var c = classes;
	while(c--){
		if(!stationary[index][c]){
			votes[index][c] -= decay[c];
			if(votes[index][c] <= 0){
				votes[index][c] = 0;
				connections[index].sendUTF(JSON.stringify({type:'reactivate', value:c}));
				stationary[index][c] = true;
			}
		}
	}
}
function updateVote(category, index){

	if(category == 4 ){
		if(votes[index][category][4] == 0){
			votes[index][4] = 1;
			votes[index][5] = 0;
		}
	} else if (category == 5) {
		if(votes[index][category][5] == 0){
			votes[index][5] = 1;
			votes[index][4] = 0;
		}
	}
	else {
		stationary[index][category] = false;
		if (votes[index][category] == 0)
			votes[index][category] = 1;
	}
}

function evaluateVotes() {
	var result = [];
	for(var c = 0; c < classes; c++) {
		result.push(0);
		var i = votes.length;
		while(i--){
			result[c] += votes[i][c];
		}
	}
	
	return result;
}

intervals = [];
var currentResults = new Array(classes).fill(0);
var updateInterval = 90; //should stay fixed! have to recalculate decay otherwise.

setInterval(function(){
	var i = votes.length;
	while(i--){
		decayVote(i);
	}
	currentResults = evaluateVotes();
}, updateInterval);

// WebSocket server
wsServer.on('request', function(request) {
  var connection = request.accept(null, request.origin);
  
  if (clients.indexOf(request.remoteAddress) < 0){
	clients.push(request.remoteAddress);
	connections.push(connection);
	votes.push(new Array(classes).fill(0));
	stationary.push(new Array(classes).fill(true));
	
	console.log("Client connected! (" + clients.length + ")");
  }

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
		var obj = null;
		try {
			obj = JSON.parse(message.utf8Data);
		} catch (e) {
			console.log("JSON.parse failed for message: " + message);
			return;
		}
		switch(obj.type) 
		{
			case "vote":
				var index = clients.indexOf(request.remoteAddress);
				
				updateVote(parseInt(obj.value), index);
			break;
			
			case "state":
				console.log("State requested by " + this.remoteAddress);
				intervals.push(setInterval(function(){ this.connection.sendUTF(JSON.stringify({type:"result", value:currentResults})); }, Math.min(100, obj.value)));
				intervals[intervals.length - 1].connection = this;
			break;
		}
		
		//console.log(JSON.stringify(obj));
      // process WebSocket message
    }
  });

  connection.on('close', function(connection) {
	  
		var index = clients.indexOf(request.remoteAddress);
	  clients.splice(index, 1);
	  votes.splice(index, 1);
	  connections.splice(index, 1);
	  
	  var i = intervals.length;
	  while(i--){
		  if (intervals[i].connection.remoteAddress == this.remoteAddress)
			  intervals.splice(i, 1);
	  }
	  
	  console.log("Client disconnected! (" + clients.length + ")");
    // close user connection
  });
});