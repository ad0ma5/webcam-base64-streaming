const path = require('path');
const express = require('express');
const http = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const app = express();
                //SSLCertificateFile      /etc/ssl/certs/apache-selfsigned.crt
                //SSLCertificateKeyFile /etc/ssl/private/apache-selfsigned.key
var key = fs.readFileSync( '/etc/ssl/private/apache-selfsigned.key');
var cert = fs.readFileSync( '/etc/ssl/certs/apache-selfsigned.crt');
var options = {
  key: key,
  cert: cert
};
const httpServer = http.createServer(options, app);
//const httpServer = http.createServer( app);

const PORT = process.env.PORT || 3003;

const wsServer = new WebSocket.Server({ server: httpServer }, () => console.log(`WS server is listening at ws://localhost:${WS_PORT}`));

// array of connected websocket clients
let connectedClients = [];

wsServer.on('connection', (ws, req) => {
    console.log('Connected');
	ws.markedAsSender = false;
    // add new connected client
    connectedClients.push(ws);
    // listen for messages from the streamer, the clients will not send anything so we don't need to filter
    ws.on('message', data => {
		let streamerNo = JSON.parse(data).streamerNo;
		if(!ws.markedAsSender){
			console.log('marking as sender as msg received');
			ws.markedAsSender = true;
			ws.streamerNo = streamerNo;
		}
		//console.log("message incomming",connectedClients);
        // send the base64 encoded frame to each connected ws
        connectedClients.forEach((ws_i, i) => {
            if (ws_i.readyState === ws_i.OPEN) { // check if it is still connected
				if(ws_i == ws || ws_i.markedAsSender){
					//console.log('same as sender not sending img back', i);
					
					//return 0;
				}
				else{
					//console.log('not same as sender sending img', i);
                	ws_i.send(data); // send
				}
            } else { // if it's not connected remove from the array of connected ws
                if(connectedClients[i].markedAsSender){
					console.log('need to send receivers closed streamer notice');
					connectedClients.forEach((ws_c, ii) => {   
						if(ws_c.markedAsSender){
						
						}else{
							console.log('sending to client no ', ws_i.streamerNo);
							let response = { data:"disconnected", streamerNo: ws_i.streamerNo };
							ws_c.send(JSON.stringify(response));
						}
					})
				}
				connectedClients.splice(i, 1);
				console.log('disconnected client ',i);
				

            }
        });
    });
});

// HTTP stuff
let streamerNo = 0;
app.get('/client', (req, res) => res.sendFile(path.resolve(__dirname, './client.html')));
app.get('/streamer', (req, res) => {
	//streamerNo++;
	//console.log("New Streamer:" streamerNo);
	res.sendFile(path.resolve(__dirname, './streamer.html'));
})
app.get('/streamerNo', (req, res) => {
	streamerNo++;
	console.log("New Streamer:" ,streamerNo);
	res.send(``+streamerNo);
});

app.get('/', (req, res) => {
    res.send(`
        <a href="streamer">Streamer</a><br>
        <a href="client">Client</a>
    `);
});
httpServer.listen(PORT, () => console.log(`HTTP server listening at http://localhost:${PORT}`));
