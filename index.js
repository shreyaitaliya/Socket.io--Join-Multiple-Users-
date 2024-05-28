const express = require('express');
const http = require('http');
const { join } = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});


const generalNamespace = io.of('/general');
let users = 0;
const roomUsers = {};
let currentRoom = '';
const userNames = {};

generalNamespace.on('connection', (socket) => {
    console.log('A User Connected to General Namespace');

    socket.on('set username', (username, userType) => {
        userNames[socket.id] = username;
        users++;

        if (userType === 'admin') {
            socket.disconnect(true);
            return;
        }

        generalNamespace.to(currentRoom).emit('broadcast', { message: `${username} has joined the chat (${users} users connected)` });
    });

    socket.on('join room', (room) => {
        socket.join(room);

        if (!roomUsers[room]) {
            roomUsers[room] = {};
        }
        roomUsers[room][socket.id] = userNames[socket.id];

        generalNamespace.to(room).emit('broadcast', { message: `${userNames[socket.id]} has joined room ${room}` });

        currentRoom = room;
    });

    socket.on('leave room', (room) => {
        socket.leave(room);

        if (roomUsers[room] && roomUsers[room][socket.id]) {
            delete roomUsers[room][socket.id];
        }

        generalNamespace.to(room).emit('broadcast', { message: `${userNames[socket.id]} has left room ${room}` });

        currentRoom = '';
    });

    socket.on('disconnect', () => {
        const username = userNames[socket.id];
        if (username) {
            delete userNames[socket.id];
            users--;

            generalNamespace.to(currentRoom).emit('broadcast', { message: `${username} has left the chat (${users} users connected)` });
        }
        console.log('A User Disconnected from General Namespace');
    });

    socket.on('chat message', (data) => {
        const { room, msg } = data;
        const username = userNames[socket.id] || 'Anonymous';

        if (roomUsers[room] && roomUsers[room][socket.id]) {
            console.log(`${username} in ${room}: ${msg}`);
            generalNamespace.to(room).emit('chat message', { username, msg });
        } else {
            console.log(`${username} does not have permission to send messages in ${room}`);
        }
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
