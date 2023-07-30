class Player {
  constructor({
    x,
    y,
    radius,
    color,
    username,
    previousUpdate,
    nextUpdate,
    timeReceived
  }) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.username = username
  }

  draw() {
    c.save()
    c.shadowColor = this.color // Set the shadow color
    c.shadowBlur = 40 // Set the amount of blur
    c.shadowOffsetX = 0 // Set the horizontal distance of the shadow
    c.shadowOffsetY = 0 // Set the vertical distance of the shadow

    c.beginPath()
    c.arc(
      this.x,
      this.y,
      this.radius * window.devicePixelRatio,
      0,
      Math.PI * 2,
      false
    )
    c.fillStyle = this.color
    c.fill()

    c.font = '24px sans-serif'
    c.fillStyle = 'white'
    c.fillText(this.username, this.x - 20, this.y + 50)

    c.restore()
  }
}
