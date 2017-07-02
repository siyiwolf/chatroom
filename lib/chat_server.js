var socketio =  require('socket.io');
var io;
var guestNumber = 1;
var nickName = {};
var nameUsed = [];
var currentRoom = {};

exports.listen = function(server)
{
  console.log('Chat server beigin listen');
  io = socketio.listen(server);
  io.set('log level', 1);
  io.sockets.on('connection', function(socket){
    console.log("io socket connect success");
    guestNumber =  assignGuestName(socket, guestNumber, nickName, nameUsed);
    joinRoom(socket, 'Lobby');

    handleMessageBroadcasting(socket, nickName);
    handleNameChangeAttempts(socket, nickName, nameUsed);
    handleRoomJoining(socket);

    socket.on('rooms', function(){
      socket.emit('rooms', io.sockets.manager.rooms)
    });

    handleClientDisconnection(socket, nickName, nameUsed);
  });
};

function assignGuestName(socket, guestNumber, nickName, nameUsed)
{
  console.log("function assignGuestName");
  var name = 'Guest' +  guestNumber;
  nickName[socket.id] = name;
  console.log("Function:AssignGuestName: " + name);
  socket.emit('nameResult', {success:true,
                             name:name
  });
  nameUsed.push(name);
  return guestNumber + 1;
}

function joinRoom(socket, room)
{
  socket.join(room);
  currentRoom[socket.id] = room;
  console.log("Function:joinRoom: " + room);
  socket.emit('joinResult', {room:room});
  socket.broadcast.to(room).emit('message', {text:nickName[socket.id] + ' has joined ' + room + '.'});
  var usersInRoom = io.sockets.clients(room);

  if (usersInRoom.length > 1)
  {
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var index in usersInRoom)
    {
      var userSocketId = usersInRoom[index].id;
      if (userSocketId != socket.id)
      {
        if (index > 0)
        {
          usersInRoomSummary += ',';
        }
        usersInRoomSummary += nickName[userSocketId];
      }
    }
    usersInRoomSummary += '.';
    console.log("UserInRoomSummary");
    socket.emit('message', {text:usersInRoomSummary});
  }
}

function handleNameChangeAttempts(socket, nickName, nameUsed)
{
  console.log("Function:HandleNameChangeAttemps");
  socket.on('nameAttempt', function(name){
    if (name.indexOf('Guest') == 0)
    {
      socket.emit('nameResult', {
        sucess:false,
        message:'Names cannot begin with "Guest".'
      });
    }
    else
    {
      if (nameUsed.indexOf(name) == -1)
      {
        var previousName =  nickName[socket.id];
        var previousNameIndex = nameUsed.indexOf(previousName);
        nameUsed.push(name);
        nickName[socket.id] = name;
        delete nameUsed[previousNameIndex];
        socket.emit('nameResult', {
          success:true,
          name:name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text:previousName + ' is now known as ' + name + '.'
        });
      }
      else
      {
        socket.emit('nameResult', {
          success:false,
          message:'That name is already in use.'
        });
      }
    }
  });
}

function handleMessageBroadcasting(socket)
{
  console.log("Function:handleMessageBroadcasting!!");
  socket.on('message', function(message){
    socket.broadcast.to(message.room).emit('message', {
      text:nickName[socket.id] + ': ' + message.text
    });
  });
}

function handleRoomJoining(socket)
{
  console.log("Function:handleRoomJoining!!");
  socket.on('join', function(room){
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleClientDisconnection(socket)
{
  console.log("Function:handleClientDisconnetion")
  socket.on('disconnect', function(){
    var nameIndex = nameUsed.indexOf(nickName[socket.id]);
    delete nameUsed[nameIndex];
    delete nickName[socket.id];
  });
}
