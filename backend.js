const express = require('express')
const app = express()

// socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const port = process.env.PORT || 3000;

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backEndPlayers = {}
const backEndProjectiles = {}

const SPEED = 10
const RADIUS = 10
const PROJECTILE_RADIUS = 5
let projectileId = 0

io.on('connection', (socket) => {
  console.log('a user connected')

  io.emit('updatePlayers', backEndPlayers)

  socket.on('shoot', ({ x, y, angle }) => {
    projectileId++

    const velocity = {
      x: Math.cos(angle) * 10,
      y: Math.sin(angle) * 10
    }

    backEndProjectiles[projectileId] = {
      x,
      y,
      velocity,
      playerId: socket.id
    }

    console.log(backEndProjectiles)
  })

  socket.on('initGame', ({ username, width, height, devicePixelRatio }) => {
    backEndPlayers[socket.id] = {
      x: (width - RADIUS) * Math.random() + RADIUS,
      y: (height - RADIUS) * Math.random() + RADIUS,
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username
    }

    // where we init our canvas
    backEndPlayers[socket.id].canvas = {
      width,
      height
    }

    backEndPlayers[socket.id].radius = RADIUS

    if (devicePixelRatio > 1) {
      backEndPlayers[socket.id].radius = 2 * RADIUS
    }
  })

  socket.on('disconnect', (reason) => {
    console.log(reason)
    delete backEndPlayers[socket.id]
    io.emit('updatePlayers', backEndPlayers)
  })

  socket.on('keydown', ({ keycode, sequenceNumber }) => {
    backEndPlayers[socket.id].sequenceNumber = sequenceNumber
    switch (keycode) {
      case 'KeyW':
        backEndPlayers[socket.id].y -= SPEED
        break

      case 'KeyA':
        backEndPlayers[socket.id].x -= SPEED
        break

      case 'KeyS':
        backEndPlayers[socket.id].y += SPEED
        break

      case 'KeyD':
        backEndPlayers[socket.id].x += SPEED
        break
    }

    const isOnScreen = {
      left: backEndPlayers[socket.id].x - backEndPlayers[socket.id].radius <= 0,
      right:
        backEndPlayers[socket.id].x + backEndPlayers[socket.id].radius >=
        backEndPlayers[socket.id].canvas.width,
      top: backEndPlayers[socket.id].y - backEndPlayers[socket.id].radius <= 0,
      bottom:
        backEndPlayers[socket.id].y + backEndPlayers[socket.id].radius >=
        backEndPlayers[socket.id].canvas.height
    }

    if (isOnScreen.left)
      backEndPlayers[socket.id].x = backEndPlayers[socket.id].radius

    if (isOnScreen.right)
      backEndPlayers[socket.id].x =
        backEndPlayers[socket.id].canvas.width -
        backEndPlayers[socket.id].radius

    if (isOnScreen.top)
      backEndPlayers[socket.id].y = backEndPlayers[socket.id].radius

    if (isOnScreen.bottom)
      backEndPlayers[socket.id].y =
        backEndPlayers[socket.id].canvas.height -
        backEndPlayers[socket.id].radius
  })
})

// backend ticker
setInterval(() => {
  // update projectile positions
  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y

    const PROJECTILE_RADIUS = 5
    if (
      backEndProjectiles[id].x - PROJECTILE_RADIUS >=
        backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.height ||
      backEndProjectiles[id].x + PROJECTILE_RADIUS <= 0 ||
      backEndProjectiles[id].y - PROJECTILE_RADIUS >=
        backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.height ||
      backEndProjectiles[id].y + PROJECTILE_RADIUS <= 0
    ) {
      delete backEndProjectiles[id]
      continue
    }

    for (const playerId in backEndPlayers) {
      const backEndPlayer = backEndPlayers[playerId]

      const DISTANCE = Math.hypot(
        backEndProjectiles[id].x - backEndPlayer.x,
        backEndProjectiles[id].y - backEndPlayer.y
      )

      // collision detection
      if (
        DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius &&
        backEndProjectiles[id].playerId !== playerId
      ) {
        if (backEndPlayers[backEndProjectiles[id].playerId])
          backEndPlayers[backEndProjectiles[id].playerId].score++

        console.log(backEndPlayers[backEndProjectiles[id].playerId])
        delete backEndProjectiles[id]
        delete backEndPlayers[playerId]
        break
      }
    }
  }

  io.emit('updateProjectiles', backEndProjectiles)
  io.emit('updatePlayers', backEndPlayers)
}, 15)

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

console.log('server did load')
