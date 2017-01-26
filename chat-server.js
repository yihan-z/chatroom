var rooms = [];
var current_roomId = 0;
var users_and_id ={};

function Room(name, owner, checkPrivate, password){
	this.name = name;
	this.roomId = current_roomId;
	current_roomId++;
	this.owner = owner;
	this.users = [];
	this.checkPrivate = checkPrivate;
	this.password = password;
	this.messageIds = [];
	this.banlist = [];
	this.addUser = function(newUser){
		this.users.push(newUser);
		console.log(newUser + " is added to the current room");
	};
	this.removeUser = function(rmUser){
		if (this.users.indexOf(rmUser) > -1){
			this.users.splice(this.users.indexOf(rmUser),1);
			console.log(rmUser + " is removed from the current room");
		}
	}
}


var mainRoom = new Room("Main", "", false, "");
rooms.push(mainRoom);
// function addRoom(name, owner, checkPrivate, password){
// 	var room = new Room (name, owner, checkPrivate, password);
// 	rooms.push(room);
// }



function banUser(roomId, kicker, user){
	kickUser(roomId, kicker, user);
}

function kickUser(roomId, kicker, user){
	rooms[roomId].removeUser(user);
}







// Require the packages we will use:
var http = require("http"),
socketio = require("socket.io"),
fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.

	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.

		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);

// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.

	socket.emit("send_all_rooms_to_client",rooms);

	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.

		console.log("user: " + data["user"] + "message: "+data["message"]+"roomId: " + data["roomId"]); // log it to the Node.JS output
		io.sockets.emit("message_to_client",{user:data["user"], message:data["message"], roomId:data["roomId"]}) // broadcast the message to other users
	});

	socket.on("ban_to_server" ,function(data){
		if (rooms[data["roomId"]].owner == data["kicker"] && rooms[data["roomId"]].checkPrivate == true){
			banUser(data["roomId"], data["kicker"], data["user"]);
			io.sockets.emit( "ban_to_client"  ,{user:data["user"], remainingUsers:rooms[data["roomId"]].users,roomId:data["roomId"], success: true});

		}
		else{
			console.log("Failed");
			io.sockets.emit("ban_to_client",{user:data["user"], remainingUsers:rooms[data["roomId"]].users,roomId:data["roomId"], success: false});
		}
	});


	socket.on( "kick_to_server" ,function(data){
		if (rooms[data["roomId"]].owner == data["kicker"] && rooms[data["roomId"]].checkPrivate == true){
			kickUser(data["roomId"], data["kicker"], data["user"]);
			io.sockets.emit( "kick_to_client" ,{user:data["user"], remainingUsers:rooms[data["roomId"]].users,roomId:data["roomId"], success: true});

		}
		else{
			console.log("Failed");
			io.sockets.emit( "kick_to_client" ,{user:data["user"], roomId:data["roomId"], success: false});
		}
	});



	socket.on("new_room_to_server", function(data){
		var check = true;

		for (var i = 0; i < rooms.length; i++){
			if (rooms[i].name == data["room"]){
				check = false;
				socket.emit( "new_room_to_client" ,{success:false});
			}
		}
		if (check == true){
			var room = new Room (data["room"], data["user"], data["isPrivate"], data["password"]);
			rooms.push(room);

			io.sockets.emit( "new_room_to_client" ,{success:true, room:room});
		}


	});

	socket.on("new_user_to_server", function(data){

		if (rooms[data["roomId"]].checkPrivate == true && rooms[data["roomId"]].banlist.indexOf(data["user"]) > -1){
			socket.emit("ban_user_fail_access_to_client",{succuss: false});
			console.log("sth went wrong: user banned");
		}
		else{
			console.log("new user: " + data["user"] + " to room: " + data["roomId"]);
			rooms[data["roomId"]].users.push(data["user"]);
			io.sockets.emit("new_user_to_client", {users: rooms[data["roomId"]].users, roomId: data["roomId"]});
		}
	
	});

	socket.on("user_leave_to_server", function(data){
		rooms[data["roomId"]].removeUser(data["user"]);
		io.sockets.emit("user_leave_to_client", {user:data["user"], remainingUsers:rooms[data["roomId"]].users, roomId: data["roomId"]});

	});


	socket.on("chat_private_server", function(data){
		//io.to(users_and_id[data['user']])('message', data['msg']);
		var twoChat = new Room("private message "+ data["message_sender"] + " and " + data["user"], data["message_sender"], false, "");
		// twoChat.users.push(data["message_sender"]);
		// twoChat.users.push(data["user"]);
		rooms.push(twoChat);
		io.sockets.emit( "new_room_to_client" ,{success:true, room:twoChat});
		// rooms[current_roomId-1].users.push(data["message_sender"]);
		// rooms[current_roomId-1].users.push(data["user"]);
		//console.log("ur: " + rooms[current_roomId-1].users[0]);
		//io.sockets.emit("new_user_to_client", {users: rooms[current_roomId-1].users, roomId: rooms[current_roomId-1].roomId});
		io.sockets.emit("new_user_to_client", {users: [data["message_sender"], data["user"]], roomId: twoChat.roomId});
	});




});