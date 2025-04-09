export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.prince = null;
    this.planets = [];
    this.currentPlanet = null;
    this.isJumping = false;
  }

  preload() {
    // Load game assets using dynamic imports
    const princeURL = new URL('../assets/prince.png', import.meta.url);
    const planetURL = new URL('../assets/planet.png', import.meta.url);
    const roseURL = new URL('../assets/rose.png', import.meta.url);
    const backgroundURL = new URL('../assets/background.png', import.meta.url);

    this.load.image('prince', princeURL.href);
    this.load.image('planet', planetURL.href);
    this.load.image('rose', roseURL.href);
    this.load.image('background', backgroundURL.href);
  }

  create() {
    // Add background
    const background = this.add.image(400, 300, 'background');
    background.setScale(0.5); // Scale background to fit the game

    // Create planets
    this.createPlanets();

    // Create the Little Prince
    this.prince = this.physics.add.sprite(400, 300, 'prince');
    this.prince.setScale(0.1); // Make the prince much smaller
    this.prince.setCollideWorldBounds(true);
    // Adjust the prince's collision body size
    this.prince.body.setSize(this.prince.width * 0.8, this.prince.height * 0.8);

    // Add controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add collision between prince and planets
    this.physics.add.collider(this.prince, this.planets);
  }

  createPlanets() {
    const planetPositions = [
      { x: 200, y: 200 },
      { x: 600, y: 200 },
      { x: 400, y: 400 },
      { x: 200, y: 500 },
      { x: 600, y: 500 }
    ];

    planetPositions.forEach(pos => {
      const planet = this.physics.add.sprite(pos.x, pos.y, 'planet');
      planet.setScale(0.15); // Make planets smaller
      planet.setImmovable(true);
      planet.body.setCircle(planet.width * 0.15); // Adjust collision circle to match visual size
      this.planets.push(planet);
    });

    // Add the rose on the last planet
    const lastPlanet = this.planets[this.planets.length - 1];
    this.rose = this.physics.add.sprite(lastPlanet.x, lastPlanet.y - 40, 'rose');
    this.rose.setScale(0.08); // Make the rose smaller
  }

  update() {
    if (this.cursors.left.isDown) {
      this.prince.setVelocityX(-160);
    } else if (this.cursors.right.isDown) {
      this.prince.setVelocityX(160);
    } else {
      this.prince.setVelocityX(0);
    }

    if (this.cursors.up.isDown && !this.isJumping) {
      this.prince.setVelocityY(-330);
      this.isJumping = true;
    }

    // Apply gravity towards nearest planet
    this.applyPlanetaryGravity();

    // Check if prince reached the rose
    if (Phaser.Math.Distance.Between(
      this.prince.x, this.prince.y,
      this.rose.x, this.rose.y
    ) < 50) {
      this.gameWon();
    }
  }

  applyPlanetaryGravity() {
    let nearestPlanet = null;
    let minDistance = Infinity;

    this.planets.forEach(planet => {
      const distance = Phaser.Math.Distance.Between(
        this.prince.x, this.prince.y,
        planet.x, planet.y
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestPlanet = planet;
      }
    });

    if (nearestPlanet) {
      const angle = Phaser.Math.Angle.Between(
        this.prince.x, this.prince.y,
        nearestPlanet.x, nearestPlanet.y
      );
      
      const gravityForce = 200;
      this.prince.setVelocityX(this.prince.body.velocity.x + Math.cos(angle) * gravityForce * 0.02);
      this.prince.setVelocityY(this.prince.body.velocity.y + Math.sin(angle) * gravityForce * 0.02);

      if (minDistance < 50) {
        this.isJumping = false;
      }
    }
  }

  gameWon() {
    this.add.text(400, 300, 'You found the rose!', {
      fontSize: '32px',
      fill: '#fff'
    }).setOrigin(0.5);
    
    this.physics.pause();
  }
} 