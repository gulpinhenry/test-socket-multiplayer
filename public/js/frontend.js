const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io()

const scoreEl = document.querySelector('#scoreEl')

const devicePixelRatio = window.devicePixelRatio || 1

canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio

const x = canvas.width / 2
const y = canvas.height / 2

const frontEndPlayers = {}
const frontEndProjectiles = {}

let lastProjectileUpdateTime = Date.now()
socket.on('updateProjectiles', (backEndProjectiles) => {
  const currentTime = Date.now()
  const duration = (currentTime - lastProjectileUpdateTime) / 1000 // Convert to seconds
  lastProjectileUpdateTime = currentTime
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id]

    if (!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        radius: 5,
        color: frontEndPlayers[backEndProjectile.playerId]?.color,
        velocity: backEndProjectile.velocity
      })
      frontEndProjectiles[id].target = {
        x: backEndProjectile.x,
        y: backEndProjectile.y
      }
    } else {
      frontEndProjectiles[id].target = {
        x: backEndProjectile.x,
        y: backEndProjectile.y
      }
    }
  }

  for (const frontEndProjectileId in frontEndProjectiles) {
    if (!backEndProjectiles[frontEndProjectileId]) {
      delete frontEndProjectiles[frontEndProjectileId]
    }
  }
})

const lerpFactor = 0.1
let lastUpdateTime = Date.now()
let updateTimes = []
let updateRate = 0.15
socket.on('updatePlayers', (backEndPlayers) => {
  let now = Date.now()
  updateTimes.push(now - lastUpdateTime)

  // Keep only the last 10 update times
  if (updateTimes.length > 10) {
    updateTimes.shift()
  }

  updateRate = updateTimes.reduce((a, b) => a + b) / updateTimes.length / 1000 // Convert from ms to s

  lastUpdateTime = now

  for (const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id]

    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backEndPlayer.x,
        y: backEndPlayer.y,
        radius: 10,
        color: backEndPlayer.color,
        username: backEndPlayer.username,
        previousUpdate: { x: backEndPlayer.x, y: backEndPlayer.y },
        nextUpdate: { x: backEndPlayer.x, y: backEndPlayer.y },
        timeReceived: Date.now()
      })

      document.querySelector(
        '#playerLabels'
      ).innerHTML += `<div data-id="${id}" data-score="${backEndPlayer.score}">${backEndPlayer.username}: ${backEndPlayer.score}</div>`
    } else {
      frontEndPlayers[id].previousUpdate = frontEndPlayers[id].nextUpdate
      frontEndPlayers[id].nextUpdate = {
        x: backEndPlayer.x,
        y: backEndPlayer.y
      }
      frontEndPlayers[id].timeReceived = Date.now()

      document.querySelector(
        `div[data-id="${id}"]`
      ).innerHTML = `${backEndPlayer.username}: ${backEndPlayer.score}`

      document
        .querySelector(`div[data-id="${id}"]`)
        .setAttribute('data-score', backEndPlayer.score)

      // sorts the players divs
      const parentDiv = document.querySelector('#playerLabels')
      const childDivs = Array.from(parentDiv.querySelectorAll('div'))

      childDivs.sort((a, b) => {
        const scoreA = Number(a.getAttribute('data-score'))
        const scoreB = Number(b.getAttribute('data-score'))

        return scoreB - scoreA
      })

      // removes old elements
      childDivs.forEach((div) => {
        parentDiv.removeChild(div)
      })

      // adds sorted elements
      childDivs.forEach((div) => {
        parentDiv.appendChild(div)
      })
      if (id === socket.id) {
        // if a player already exists
        const lastBackendInputIndex = playerInputs.findIndex((input) => {
          return backEndPlayer.sequenceNumber === input.sequenceNumber
        })

        if (lastBackendInputIndex > -1)
          playerInputs.splice(0, lastBackendInputIndex + 1)

        playerInputs.forEach((input) => {
          // frontEndPlayers[id].target.x += input.dx
          // frontEndPlayers[id].target.y += input.dy
        })
      }
    }
  }

  // this is where we delete frontend players
  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
      const divToDelete = document.querySelector(`div[data-id="${id}"]`)
      divToDelete.parentNode.removeChild(divToDelete)

      if (id === socket.id) {
        document.querySelector('#usernameForm').style.display = 'block'
      }

      delete frontEndPlayers[id]
    }
  }
})

let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  // c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.clearRect(0, 0, canvas.width, canvas.height)
  const now = Date.now()

  for (const id in frontEndPlayers) {
    const frontEndPlayer = frontEndPlayers[id]
    const elapsedTime = (now - frontEndPlayer.timeReceived) / 1000 // convert ms to seconds
    const lerpFactor = elapsedTime / updateRate // assuming `updateRate` is the time between server updates

    frontEndPlayer.x = lerp(
      frontEndPlayer.previousUpdate.x,
      frontEndPlayer.nextUpdate.x,
      lerpFactor
    )
    frontEndPlayer.y = lerp(
      frontEndPlayer.previousUpdate.y,
      frontEndPlayer.nextUpdate.y,
      lerpFactor
    )

    frontEndPlayer.draw()
  }

  for (const id in frontEndProjectiles) {
    const frontEndProjectile = frontEndProjectiles[id]
    if (frontEndProjectile.target) {
      frontEndProjectile.x +=
        (frontEndProjectile.target.x - frontEndProjectile.x) * lerpFactor
      frontEndProjectile.y +=
        (frontEndProjectile.target.y - frontEndProjectile.y) * lerpFactor
    }

    frontEndProjectile.draw()
  }

  // for (let i = frontEndProjectiles.length - 1; i >= 0; i--) {
  //   const frontEndProjectile = frontEndProjectiles[i]
  //   frontEndProjectile.update()
  // }
}

animate()

const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }
}

function lerp(a, b, t) {
  return a + t * (b - a)
}

const SPEED = 10
const playerInputs = []
let sequenceNumber = 0
setInterval(() => {
  if (!frontEndPlayers[socket.id]) return

  const isOnScreen = {
    left:
      frontEndPlayers[socket.id].x - frontEndPlayers[socket.id].radius - SPEED >
      0,
    right:
      frontEndPlayers[socket.id].x + frontEndPlayers[socket.id].radius + SPEED <
      canvas.width,
    top:
      frontEndPlayers[socket.id].y - frontEndPlayers[socket.id].radius - SPEED >
      0,
    bottom:
      frontEndPlayers[socket.id].y + frontEndPlayers[socket.id].radius + SPEED <
      canvas.height
  }

  if (keys.w.pressed && isOnScreen.top) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: -SPEED })
    frontEndPlayers[socket.id].y -= SPEED
    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber })
  }

  if (keys.a.pressed && isOnScreen.left) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: -SPEED, dy: 0 })
    frontEndPlayers[socket.id].x -= SPEED
    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber })
  }

  if (keys.s.pressed && isOnScreen.bottom) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: SPEED })
    frontEndPlayers[socket.id].y += SPEED
    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber })
  }

  if (keys.d.pressed && isOnScreen.right) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: SPEED, dy: 0 })
    frontEndPlayers[socket.id].x += SPEED
    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber })
  }
}, 15)

window.addEventListener('keydown', (event) => {
  if (!frontEndPlayers[socket.id]) return

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = true
      break

    case 'KeyA':
      keys.a.pressed = true
      break

    case 'KeyS':
      keys.s.pressed = true
      break

    case 'KeyD':
      keys.d.pressed = true
      break
  }
})

window.addEventListener('keyup', (event) => {
  if (!frontEndPlayers[socket.id]) return

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = false
      break

    case 'KeyA':
      keys.a.pressed = false
      break

    case 'KeyS':
      keys.s.pressed = false
      break

    case 'KeyD':
      keys.d.pressed = false
      break
  }
})

document.querySelector('#usernameForm').addEventListener('submit', (event) => {
  event.preventDefault()
  document.querySelector('#usernameForm').style.display = 'none'
  socket.emit('initGame', {
    width: canvas.width,
    height: canvas.height,
    devicePixelRatio,
    username: document.querySelector('#usernameInput').value
  })
})
