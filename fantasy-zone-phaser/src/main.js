// 같은 src 폴더에 있는 style.css 파일을 불러옵니다.
import './style.css'; 

// node_modules에 설치된 Phaser 라이브러리를 불러옵니다.
import Phaser from 'phaser';

// =================================================================
// 0. 게임 데이터 및 설정
// =================================================================
const GameConfig = {
    player: {
        baseSpeed: 220, 
        initialLives: 3,
        fireRate: 150,
        respawnInvincibility: 2000
    },
    enemy: {
        baseSpeed: 150,
        spawnDelay: 1500,
        baseFireRate: 2000,
        bulletSpeed: 350,
    },
    boss: {
        baseHealth: 50,
        coinDrop: 50,
        bulletSpeed: 400
    },
    world: {
        width: 800 * 3,
        height: 600 * 3
    },
    hitsForBoss: 100
};

const UPGRADE_DATA = {
    weaponType: { name: '무기 타입', description: '총알 형태와 위력 강화', maxLevel: 5, cost: 150 },
    fireRate: { name: '연사 속도', description: '총알 발사 속도 증가', maxLevel: 5, cost: 120 },
    moveSpeed: { name: '엔진 출력', description: '플레이어 이동 속도 증가', maxLevel: 5, cost: 100 },
    coinValue: { name: '코인 자석', description: '코인 획득 가치 증가', maxLevel: 5, cost: 300 }
};

const WEAPON_DATA = [
    { level: 0, bulletSize: 5, bulletCount: 1, spread: 0 },
    { level: 1, bulletSize: 8, bulletCount: 1, spread: 0 },
    { level: 2, bulletSize: 5, bulletCount: 2, spread: 0.2 },
    { level: 3, bulletSize: 8, bulletCount: 2, spread: 0.2 },
    { level: 4, bulletSize: [8, 5, 5], bulletCount: 3, spread: 0.3 },
    { level: 5, bulletSize: 8, bulletCount: 3, spread: 0.4 }
];


// =================================================================
// 하이스코어 관리자
// =================================================================
const ScoreManager = {
    STORAGE_KEY: 'shapeZoneHighScores',
    MAX_SCORES: 5,

    loadScores() {
        const scoresJSON = localStorage.getItem(this.STORAGE_KEY);
        if (scoresJSON) {
            try {
                return JSON.parse(scoresJSON);
            } catch (e) {
                console.error("하이스코어 파싱 오류:", e);
                return [];
            }
        }
        return [];
    },

    saveScores(scores) {
        scores.sort((a, b) => b.score - a.score);
        const topScores = scores.slice(0, this.MAX_SCORES);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(topScores));
    },

    isHighScore(score) {
        const scores = this.loadScores();
        if (scores.length < this.MAX_SCORES) {
            return true;
        }
        const lowestScore = scores[scores.length - 1].score;
        return score > lowestScore;
    },

    addScore(name, score) {
        const scores = this.loadScores();
        scores.push({ name, score });
        this.saveScores(scores);
    }
};


// =================================================================
// 총알 클래스
// =================================================================
class Bullet extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.graphic = this.scene.add.graphics();
        this.add(this.graphic);
        scene.physics.world.enable(this);
        this.body.setCircle(5);
        this.lifespan = 0;
    }

    fire(x, y, angle, size, color = 0xff0000, velocity = 800, lifespan = 2000) {
        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.rotation = angle;
        
        this.lifespan = lifespan;

        this.graphic.clear().fillStyle(color, 1).fillCircle(0, 0, size);
        this.body.setCircle(size);

        this.scene.physics.velocityFromRotation(angle, velocity, this.body.velocity);
    }

    update(time, delta) {
        if (!this.active) return;
        
        this.lifespan -= delta;

        const worldW = this.scene.physics.world.bounds.width;
        const worldH = this.scene.physics.world.bounds.height;
        const buffer = 50; 

        if (this.lifespan <= 0 || this.x < -buffer || this.x > worldW + buffer || this.y < -buffer || this.y > worldH + buffer) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}

// =================================================================
// 1. 메인 화면 (MainMenuScene)
// =================================================================
class MainMenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MainMenuScene' }); }
    create() {
        const { width, height } = this.scale;
        this.add.graphics().fillGradientStyle(0x1d2b53, 0x1d2b53, 0x4a90e2, 0x4a90e2, 1).fillRect(0, 0, width, height);
        const title = this.add.text(width / 2, height * 0.2, '도형 존: 최종판', {
            font: '60px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 8, align: 'center'
        }).setOrigin(0.5);
        this.tweens.add({ targets: title, y: title.y - 10, duration: 1500, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
        this.add.graphics().fillStyle(0x000000, 0.5).fillRoundedRect(width / 2 - 180, height * 0.4, 360, 150, 15);
        this.add.text(width / 2, height * 0.4 + 35, '조작법', { font: '28px Arial', fill: '#fff' }).setOrigin(0.5);
        this.add.text(width / 2, height * 0.4 + 95, '이동 & 조준: 방향키\n발사: 스페이스바', { font: '18px Arial', fill: '#fff', align: 'center', lineSpacing: 4 }).setOrigin(0.5);
        const button = this.add.container(width / 2, height * 0.85);
        const buttonBg = this.add.graphics().fillStyle(0x00ff00, 1).fillRoundedRect(-120, -30, 240, 60, 20);
        const buttonText = this.add.text(0, 0, '게임 시작', { font: '32px Arial', fill: '#000000' }).setOrigin(0.5);
        button.add([buttonBg, buttonText]).setSize(240, 60).setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0, (camera, progress) => {
                if (progress === 1) this.scene.start('GameScene');
            });
        });
    }
}

// =================================================================
// 2. 상점 화면 (ShopScene)
// =================================================================
class ShopScene extends Phaser.Scene {
    constructor() { super({ key: 'ShopScene' }); }
    init(data) {
        this.gameScene = this.scene.get('GameScene');
        this.playerUpgrades = data.upgrades;
        this.playerCoins = data.coins;
        this.playerLives = data.lives;
        this.stageLevel = data.stage || 1; 
    }
    create() {
        this.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, 0, 800, 600);
        const panel = this.add.graphics().fillStyle(0x1d2b53, 1).fillRoundedRect(100, 100, 600, 400, 15);
        panel.lineStyle(4, 0xffffff, 1).strokeRoundedRect(100, 100, 600, 400, 15);
        this.add.text(400, 130, '업그레이드 상점', { font: '32px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.coinsText = this.add.text(400, 170, `보유 코인: ${this.playerCoins}`, { font: '24px Arial', fill: '#ffff00' }).setOrigin(0.5);
        
        this.generateShopItems();

        this.discountedItemId = null;
        const discountChance = Math.max(0.1, 0.9 - (this.stageLevel * 0.08));
        if (this.shopItems.length > 0 && Math.random() < discountChance) {
            const itemToDiscount = Phaser.Utils.Array.GetRandom(this.shopItems);
            this.discountedItemId = itemToDiscount.id;
        }
        
        let yPos = 220;
        this.shopItems.forEach(item => {
            this.createUpgradeButton(item, yPos);
            yPos += 70;
        });
        
        this.add.text(400, 520, '[ 상점 닫기 (ESC) ]', { font: '24px Arial', fill: '#ff4500' }).setOrigin(0.5);
        this.input.keyboard.once('keydown-ESC', this.closeShop, this);
    }

    generateShopItems() {
        let potentialUpgrades = [];
        
        for (const [id, data] of Object.entries(UPGRADE_DATA)) {
            if (this.playerUpgrades[id] < data.maxLevel) {
                potentialUpgrades.push({ id, ...data });
            }
        }
        
        this.shopItems = Phaser.Utils.Array.Shuffle(potentialUpgrades).slice(0, 4);

        if (Phaser.Math.Between(1, 2) === 1) {
            const lifeItem = { 
                id: 'extraLife', name: '추가 목숨 (1-UP)', description: '소중한 목숨을 하나 더 얻습니다.', 
                maxLevel: 10, cost: 500
            };
            if (this.shopItems.length < 4) {
                this.shopItems.push(lifeItem);
            } else {
                const replaceIndex = Phaser.Math.Between(0, this.shopItems.length - 1);
                this.shopItems[replaceIndex] = lifeItem;
            }
        }
    }

    closeShop() {
        if (!this.scene.isActive()) return;
        this.scene.stop();
        this.scene.resume('GameScene');
    }
    
    createUpgradeButton(upgrade, y) {
        let currentLevel = this.playerUpgrades[upgrade.id] || 0;
        if (upgrade.id === 'extraLife') currentLevel = this.playerLives;

        const isMaxLevel = currentLevel >= upgrade.maxLevel;
        let cost = upgrade.cost || 0;
        if(upgrade.id !== 'extraLife') {
            cost = cost * (currentLevel + 1);
        } else if (upgrade.id === 'extraLife') {
            cost = cost + (this.playerLives - GameConfig.player.initialLives) * 150;
        }

        let displayName = upgrade.name;
        const isDiscounted = (this.discountedItemId === upgrade.id);
        if (isDiscounted && !isMaxLevel) {
            displayName = `${upgrade.name} (반값 할인!)`;
            cost = Math.floor(cost / 2);
        }

        const text = `${displayName} - ${upgrade.description}`;
        let buttonText = isMaxLevel ? '최대 레벨' : `구매 (${cost} 코인)`;
        
        let buttonColor = (isMaxLevel || this.playerCoins < cost) ? '#888888' : '#7fff00';
        
        this.add.text(150, y, text, { font: '18px Arial', fill: '#ffffff' }).setOrigin(0, 0.5);
        const buyButton = this.add.text(650, y, buttonText, { font: '20px Arial', fill: buttonColor, backgroundColor: '#333', padding: { x: 10, y: 5 } }).setOrigin(1, 0.5);
        
        if (!isMaxLevel && this.playerCoins >= cost) {
            buyButton.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
                this.gameScene.purchaseUpgrade(upgrade.id, cost);
                this.playerCoins -= cost;
                
                if (upgrade.id === 'extraLife') {
                    this.playerLives++;
                } else {
                    this.playerUpgrades[upgrade.id]++;
                }
                
                this.refreshUI();
            });
        }
    }
    refreshUI() { this.children.getAll().forEach(c => c.destroy()); this.create(); }
}

// =================================================================
// 3. 게임 화면 (GameScene)
// =================================================================
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    init() {
        this.playerLives = GameConfig.player.initialLives;
        this.score = 0; 
        this.coins = 0;
        this.isGameOver = false; 
        this.isPlayerInvincible = false;
        this.bossSpawned = false; 
        this.stageLevel = 1;
        this.playerUpgrades = { 
            weaponType: 0, 
            fireRate: 0, 
            moveSpeed: 0, 
            coinValue: 1
        };
        this.facingDirection = new Phaser.Math.Vector2(1, 0);
        this.currentHits = 0;
    }

    create() {
        this.cameras.main.setBackgroundColor('#ffc0cb');
        this.physics.world.setBounds(0, 0, GameConfig.world.width, GameConfig.world.height);
        this.cameras.main.setBounds(0, 0, GameConfig.world.width, GameConfig.world.height);
        this.drawBackgroundTerrain();
        this.createPlayer();
        this.createWrappings();
        this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);
        
        this.playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
        this.enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
        this.enemies = this.physics.add.group();
        this.enemyBases = this.physics.add.group();
        this.bossGroup = this.physics.add.group();
        this.coinsGroup = this.physics.add.group();
        
        this.createUI();
        this.startStage();
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        this.lastFired = 0;
        this.setupCollisions();
        this.time.addEvent({ delay: 45000, callback: this.spawnShop, callbackScope: this, loop: true });
    }
    
    update(time) {
        if (this.isGameOver || this.scene.isPaused()) return;
        if (this.playerContainer.active) {
            this.handleMovementAndDirection();
            this.handleShooting(time);
        }
        this.wrapObjects();
        this.updateWrappings();
        if(this.boss && this.boss.active){ this.boss.rotation += 0.01; }
    }
    
    wrapObjects() {
        const worldW = this.physics.world.bounds.width;
        const worldH = this.physics.world.bounds.height;
        const buffer = 50;

        const wrap = (obj) => {
            if (obj.x < -buffer) {
                obj.x = worldW + buffer;
            } else if (obj.x > worldW + buffer) {
                obj.x = -buffer;
            }
            if (obj.y < -buffer) {
                obj.y = worldH + buffer;
            } else if (obj.y > worldH + buffer) {
                obj.y = -buffer;
            }
        };

        wrap(this.playerContainer);
        this.enemies.getChildren().forEach(wrap);
    }
    
    createPlayer() {
        const body = this.add.graphics().fillStyle(0x00ff00, 1).fillEllipse(0, 0, 50, 30);
        const cockpit = this.add.graphics().fillStyle(0xffffff, 1).fillCircle(10, 0, 8);
        const wingLeft = this.add.graphics().fillStyle(0xffff00, 1).fillEllipse(-10, -18, 25, 12);
        const wingRight = this.add.graphics().fillStyle(0xffff00, 1).fillEllipse(-10, 18, 25, 12);
        this.playerContainer = this.add.container(GameConfig.world.width / 2, GameConfig.world.height / 2, [body, wingLeft, wingRight, cockpit]);
        this.playerContainer.setSize(50, 35);
        this.physics.world.enable(this.playerContainer);
        this.playerContainer.body.setCollideWorldBounds(false).setDamping(true).setDrag(0.5).setCircle(25);
    }
    
    createWrappings() {
        const createGhost = (container) => {
            const ghost = this.add.container(0, 0).setVisible(false).setAlpha(0.7);
            container.each(child => {
                if (child instanceof Phaser.GameObjects.Graphics) {
                    const newG = this.add.graphics();
                    newG.copyPosition(child);
                    newG.commandBuffer = child.commandBuffer;
                    ghost.add(newG);
                }
            });
            return ghost;
        };
        this.playerGhost = createGhost(this.playerContainer);
    }

    updateWrappings() {
        const buffer = 100;
        const worldW = GameConfig.world.width;
        const worldH = GameConfig.world.height;
        const playerX = this.playerContainer.x;
        const playerY = this.playerContainer.y;

        let ghostX = playerX;
        let ghostY = playerY;
        let showGhost = false;

        if (playerX < buffer) {
            ghostX = playerX + worldW;
            showGhost = true;
        } else if (playerX > worldW - buffer) {
            ghostX = playerX - worldW;
            showGhost = true;
        }

        if (playerY < buffer) {
            ghostY = playerY + worldH;
            showGhost = true;
        } else if (playerY > worldH - buffer) {
            ghostY = playerY - worldH;
            showGhost = true;
        }

        if (showGhost) {
            const xChanged = ghostX !== playerX;
            const yChanged = ghostY !== playerY;
            
            if (xChanged && !yChanged) {
                if (playerY < buffer) ghostY = playerY + worldH;
                else if (playerY > worldH - buffer) ghostY = playerY - worldH;
            }
            if (yChanged && !xChanged) {
                 if (playerX < buffer) ghostX = playerX + worldW;
                 else if (playerX > worldW - buffer) ghostX = playerX - worldW;
            }

            this.playerGhost.setPosition(ghostX, ghostY);
            this.playerGhost.setRotation(this.playerContainer.rotation);
            this.playerGhost.setVisible(true);
        } else {
            this.playerGhost.setVisible(false);
        }
    }

    handleMovementAndDirection() {
        const speed = GameConfig.player.baseSpeed * (1 + this.playerUpgrades.moveSpeed * 0.15);
        let velocityX = 0; let velocityY = 0;
        if (this.cursors.left.isDown) velocityX = -1; else if (this.cursors.right.isDown) velocityX = 1;
        if (this.cursors.up.isDown) velocityY = -1; else if (this.cursors.down.isDown) velocityY = 1;
        const moveVector = new Phaser.Math.Vector2(velocityX, velocityY).normalize();
        this.playerContainer.body.setVelocity(moveVector.x * speed, moveVector.y * speed);
        if (moveVector.length() > 0) this.facingDirection.copy(moveVector);
        this.playerContainer.rotation = this.facingDirection.angle();
    }
    
    handleShooting(time) {
        if (!this.playerContainer.active) return;

        const fireRate = GameConfig.player.fireRate - (this.playerUpgrades.fireRate * 20);
        if (this.spaceBar.isDown && time > this.lastFired) {
            const weaponData = WEAPON_DATA[this.playerUpgrades.weaponType];
            const fireAngle = this.facingDirection.angle();
            const muzzlePos = new Phaser.Geom.Point(this.playerContainer.x, this.playerContainer.y);
            Phaser.Math.RotateTo(muzzlePos, this.playerContainer.x, this.playerContainer.y, fireAngle, 30);
            
            const bulletLifespan = 2000;

            if (weaponData.bulletCount === 1) {
                const bullet = this.playerBullets.get();
                if(bullet) bullet.fire(muzzlePos.x, muzzlePos.y, fireAngle, weaponData.bulletSize, 0xff0000, 800, bulletLifespan);
            } else if (weaponData.bulletCount === 2) {
                for (let i = 0; i < 2; i++) {
                    const bullet = this.playerBullets.get();
                    if(bullet) {
                        const offsetAngle = (i === 0) ? -weaponData.spread : weaponData.spread;
                        const p = Phaser.Math.RotateTo(new Phaser.Geom.Point(muzzlePos.x, muzzlePos.y), this.playerContainer.x, this.playerContainer.y, this.playerContainer.rotation + offsetAngle, 10);
                        bullet.fire(p.x, p.y, fireAngle, weaponData.bulletSize, 0xff0000, 800, bulletLifespan);
                    }
                }
            } else if (weaponData.bulletCount === 3) {
                for (let i = -1; i <= 1; i++) {
                    const bullet = this.playerBullets.get();
                    if(bullet) {
                        const angle = fireAngle + (i * weaponData.spread);
                        const size = Array.isArray(weaponData.bulletSize) ? weaponData.bulletSize[i+1] : weaponData.bulletSize;
                        bullet.fire(muzzlePos.x, muzzlePos.y, angle, size, 0xff0000, 800, bulletLifespan);
                    }
                }
            }
            this.lastFired = time + Math.max(50, fireRate);
        }
    }

    playerHit(player, enemyOrBullet) {
        if (this.isPlayerInvincible) return;

        if (enemyOrBullet.name === 'enemyBullet') {
            enemyOrBullet.setActive(false).setVisible(false);
        }
        
        this.isPlayerInvincible = true;
        this.playerLives--;

        // ★★★ 추가: 플레이어 사망 시 모든 총알 즉시 제거 ★★★
        this.playerBullets.clear(true, true);

        // ★★★ 추가: 사망 후 1초간 강제 발사 금지 ★★★
        this.lastFired = this.time.now + 1000;
        
        this.updateLivesUI();
        this.cameras.main.shake(200, 0.02);
        this.createExplosion(player.x, player.y, 0xff0000, 50);

        player.setVisible(false).body.setEnable(false);
        
        if (this.playerLives > 0) {
            this.time.delayedCall(1000, this.respawnPlayer, [], this);
        } else {
            this.gameOver();
        }
    }

    respawnPlayer() {
        const respawnX = this.cameras.main.scrollX + 400;
        const respawnY = this.cameras.main.scrollY + 300;
        this.playerContainer.setPosition(respawnX, respawnY).setVisible(true).setAlpha(0.3);
        this.playerContainer.body.setEnable(true).setVelocity(0,0);
        
        this.tweens.add({
            targets: this.playerContainer, 
            alpha: 1, 
            duration: GameConfig.player.respawnInvincibility, 
            ease: 'Linear',
            onComplete: () => {
                this.isPlayerInvincible = false;
            }
        });
    }

    setupCollisions() {
        this.physics.add.overlap(this.playerContainer, this.enemies, this.playerHit, null, this);
        this.physics.add.overlap(this.playerContainer, this.bossGroup, this.playerHit, null, this);
        this.physics.add.overlap(this.playerContainer, this.enemyBullets, this.playerHit, null, this);
        
        this.physics.add.overlap(this.playerBullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.playerBullets, this.enemyBases, this.hitBase, null, this);
        this.physics.add.overlap(this.playerBullets, this.bossGroup, this.hitBoss, null, this);
        
        this.physics.add.overlap(this.playerContainer, this.coinsGroup, this.collectCoin, null, this);
    }
    
    enemyFire(enemy) {
        if (!enemy.active || !this.playerContainer.active || !enemy.isShooter) return;
        
        const bullet = this.enemyBullets.get();
        if (bullet) {
            bullet.setName('enemyBullet');
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.playerContainer.x, this.playerContainer.y);
            const inaccuracy = (Math.PI / 6) / this.stageLevel;
            const fireAngle = angle + Phaser.Math.FloatBetween(-inaccuracy, inaccuracy);
            
            const bulletLifespan = 4000;
            
            bullet.fire(enemy.x, enemy.y, fireAngle, 6, 0xffa500, GameConfig.enemy.bulletSpeed, bulletLifespan);
        }
    }

    startStage() {
        this.bossSpawned = false;
        this.currentHits = 0;
        this.createEnemyBases();
        
        if (this.enemySpawnTimer) this.enemySpawnTimer.remove();
        this.enemySpawnTimer = this.time.addEvent({ delay: Math.max(500, GameConfig.enemy.spawnDelay / this.stageLevel), callback: this.spawnEnemy, callbackScope: this, loop: true });
        
        if (this.enemyFireTimer) this.enemyFireTimer.remove();
        this.enemyFireTimer = this.time.addEvent({
            delay: Math.max(500, GameConfig.enemy.baseFireRate / this.stageLevel),
            callback: () => {
                const shootingEnemies = this.enemies.getChildren().filter(e => e.active && e.isShooter && Phaser.Geom.Rectangle.Overlaps(this.cameras.main.worldView, e.getBounds()));
                if (shootingEnemies.length > 0) {
                    this.enemyFire(Phaser.Utils.Array.GetRandom(shootingEnemies));
                }
            },
            callbackScope: this, loop: true
        });
        if (this.uiStageText) this.uiStageText.setText(`Stage: ${this.stageLevel}`);
        this.updateHitsUI();
    }

    createUI() {
        this.uiScoreText = this.add.text(16, 16, 'Score: 0', { font: '20px Arial', fill: '#000' }).setScrollFactor(0);
        this.uiCoinsText = this.add.text(16, 40, 'Coins: 0', { font: '20px Arial', fill: '#DAA520' }).setScrollFactor(0);
        this.add.text(16, 64, 'Lives: ', { font: '20px Arial', fill: '#000' }).setScrollFactor(0);
        this.livesContainer = this.add.container(80, 74).setScrollFactor(0);
        this.updateLivesUI();
        
        this.uiStageText = this.add.text(784, 16, `Stage: ${this.stageLevel}`, { font: '20px Arial', fill: '#000' }).setOrigin(1, 0).setScrollFactor(0);
        this.uiHitsText = this.add.text(784, 40, '', { font: '20px Arial', fill: '#000' }).setOrigin(1, 0).setScrollFactor(0);
    }
    
    updateLivesUI() {
        this.livesContainer.removeAll(true);
        for (let i = 0; i < this.playerLives; i++) {
            this.livesContainer.add(this.add.graphics().fillStyle(0x00ff00).fillEllipse(i * 25, 0, 20, 12.5));
        }
    }
    
    updateHitsUI() {
        if (this.bossSpawned) {
            this.uiHitsText.setText('BOSS!!!').setColor('#ff0000');
        } else {
            this.uiHitsText.setText(`Hits: ${this.currentHits} / ${GameConfig.hitsForBoss}`).setColor('#000');
        }
    }

    updateHitCount(amount) {
        if (this.bossSpawned) return;
        this.currentHits += amount;
        this.score += amount * 10;
        this.uiScoreText.setText('Score: ' + this.score);
        this.updateHitsUI();
        if (this.currentHits >= GameConfig.hitsForBoss) {
            this.spawnBoss();
        }
    }

    purchaseUpgrade(upgradeId, cost) {
        this.coins -= cost; 
        this.uiCoinsText.setText(`Coins: ${this.coins}`);
        
        if (upgradeId === 'extraLife') { 
            this.playerLives++; 
            this.updateLivesUI();
        } else { 
            this.playerUpgrades[upgradeId]++; 
        }
    }
    
    enterShop(player, shop) {
        shop.destroy(); 
        this.scene.pause();
        this.scene.launch('ShopScene', { 
            coins: this.coins, 
            upgrades: this.playerUpgrades, 
            lives: this.playerLives,
            stage: this.stageLevel 
        });
    }
    gameOver() {
        if (this.isGameOver) return; 
        this.isGameOver = true;
        this.physics.pause();
        
        if (this.bossFireTimer) {
            this.bossFireTimer.remove();
            this.bossFireTimer = null;
        }
        if (this.enemySpawnTimer) {
            this.enemySpawnTimer.remove();
            this.enemySpawnTimer = null;
        }
        if (this.enemyFireTimer) {
            this.enemyFireTimer.remove();
            this.enemyFireTimer = null;
        }
        
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if(ScoreManager.isHighScore(this.score)) {
                this.scene.start('HighScoreEntryScene', { score: this.score, stage: this.stageLevel });
            } else {
                this.scene.start('EndScene', { score: this.score, stage: this.stageLevel });
            }
        });
    }

    nextStage() {
        this.stageLevel++; this.score += 5000 * (this.stageLevel - 1);
        this.uiScoreText.setText('Score: ' + this.score);
        const stageText = this.add.text(this.cameras.main.scrollX + 400, this.cameras.main.scrollY + 300, `STAGE ${this.stageLevel}`, { font: '60px Arial', fill: '#0000ff' }).setOrigin(0.5);
        this.tweens.add({ targets: stageText, alpha: 0, duration: 2000, onComplete: () => stageText.destroy() });
        this.time.delayedCall(1000, this.startStage, [], this);
    }
    drawBackgroundTerrain() {
        const bgGraphics = this.add.graphics();
        for (let i = 0; i < GameConfig.world.width; i += 150) {
            for (let j = 0; j < GameConfig.world.height; j += 150) {
                bgGraphics.fillStyle(Phaser.Display.Color.RandomRGB(150, 255).color, 0.3).fillCircle(i + Phaser.Math.Between(-50, 50), j + Phaser.Math.Between(-50, 50), Phaser.Math.Between(50, 150));
            }
        }
    }
    createEnemyBases() {
        this.enemyBases.clear(true, true);
        const basesToCreate = 4 + (this.stageLevel * 2);
        for (let i = 0; i < basesToCreate; i++) {
            const x = Phaser.Math.Between(200, GameConfig.world.width-200); const y = Phaser.Math.Between(200, GameConfig.world.height-200);
            const baseShape = this.add.graphics().fillStyle(0x800080).fillRect(-25, -25, 50, 50);
            const baseCore = this.add.graphics().fillStyle(0xffa500).fillCircle(0, 0, 15);
            const base = this.add.container(x, y, [baseShape, baseCore]).setSize(50, 50);
            this.physics.world.enable(base); base.body.setImmovable(true).setCircle(25); base.health = 3 + (this.stageLevel - 1); this.enemyBases.add(base);
        }
    }
    
    spawnEnemy() {
        if(this.bossSpawned) return;
        const cam = this.cameras.main; const side = Phaser.Math.Between(0, 3);
        let spawnX, spawnY;
        if (side === 0) { spawnX = Phaser.Math.Between(cam.scrollX, cam.scrollX + cam.width); spawnY = cam.scrollY - 50;
        } else if (side === 1) { spawnX = cam.scrollX + cam.width + 50; spawnY = Phaser.Math.Between(cam.scrollY, cam.scrollY + cam.height);
        } else if (side === 2) { spawnX = Phaser.Math.Between(cam.scrollX, cam.scrollX + cam.width); spawnY = cam.scrollY + cam.height + 50;
        } else { spawnX = cam.scrollX - 50; spawnY = Phaser.Math.Between(cam.scrollY, cam.scrollY + cam.height); }
        
        const enemyShape = this.add.graphics().fillStyle(0x4b0082, 0.8).fillTriangle(0, -15, -15, 15, 15, 15);
        const enemy = this.add.container(spawnX, spawnY, [enemyShape]).setSize(30, 30);
        
        const shooterChance = Math.min(0.1 * (this.stageLevel - 1), 0.5);
        enemy.isShooter = (this.stageLevel > 1 && Math.random() < shooterChance);

        if (enemy.isShooter) {
            const shooterCore = this.add.graphics().fillStyle(0xff0000).fillCircle(0, 2, 4);
            enemy.add(shooterCore);
        }

        this.physics.world.enable(enemy); this.enemies.add(enemy); enemy.body.setCircle(15);
        const angle = Phaser.Math.Angle.Between(spawnX, spawnY, this.playerContainer.x, this.playerContainer.y);
        const speed = GameConfig.enemy.baseSpeed + (this.stageLevel * 10);
        this.physics.velocityFromRotation(angle, speed, enemy.body.velocity);
    }
    spawnShop() {
        if(this.shop && this.shop.active) return;
        const shopBody = this.add.graphics().fillStyle(0xff0000, 1).fillEllipse(0, 0, 80, 100);
        const shopBasket = this.add.graphics().fillStyle(0x8B4513, 1).fillRect(-20, 50, 40, 20);
        this.shop = this.add.container(this.playerContainer.x + Phaser.Math.Between(-400, 400), this.playerContainer.y - 400, [shopBody, shopBasket]);
        this.shop.setSize(80, 120); this.physics.world.enable(this.shop);
        this.shop.body.setVelocityY(50).setBounceY(1);
        this.physics.add.overlap(this.playerContainer, this.shop, this.enterShop, null, this);
        this.time.delayedCall(10000, () => { if(this.shop) this.shop.destroy(); });
    }
    hitEnemy(bullet, enemy) {
        if (!enemy.active || !bullet.active) return;
        this.updateHitCount(1);
        enemy.destroy(); 
        if (bullet.destroy) bullet.destroy();
        this.score += 100 * this.stageLevel; 
        this.uiScoreText.setText('Score: ' + this.score);
        this.createExplosion(enemy.x, enemy.y, 0xffa500);
        if (Phaser.Math.Between(1, 3) === 1) this.createCoin(enemy.x, enemy.y);
    }
    hitBase(bullet, base) {
        if (!base.active || !bullet.active) return;
        if (bullet.destroy) bullet.destroy();
        this.tweens.add({ targets: base, alpha: 0.5, duration: 50, yoyo: true });
        const weaponData = WEAPON_DATA[this.playerUpgrades.weaponType];
        base.health -= (1 + weaponData.bulletSize / 5);
        if (base.health <= 0) {
            base.destroy(); 
            this.score += 500 * this.stageLevel; this.uiScoreText.setText('Score: ' + this.score);
            this.createExplosion(base.x, base.y, 0xff0000, 30);
            this.createCoin(base.x, base.y, 5);
        }
    }
    spawnBoss() {
        if (this.shop && this.shop.active) {
            this.shop.destroy();
        }

        this.bossSpawned = true; this.enemies.clear(true, true); if(this.enemySpawnTimer) this.enemySpawnTimer.remove(); if(this.enemyFireTimer) this.enemyFireTimer.remove();
        this.updateHitsUI();
        const bossBody = this.add.graphics().fillStyle(0x333333).fillCircle(0, 0, 80);
        const bossEye = this.add.graphics().fillStyle(0xff0000).fillCircle(0, 0, 20);
        this.boss = this.add.container(this.playerContainer.x, this.playerContainer.y - 400, [bossBody, bossEye]);
        this.boss.setSize(160, 160).setDepth(1); this.physics.world.enable(this.boss);
        this.boss.body.setCircle(80); this.bossGroup.add(this.boss);
        this.boss.health = GameConfig.boss.baseHealth * this.stageLevel;
        this.boss.body.setVelocityY(100).setBounceY(1).setCollideWorldBounds(true);
        
        const fireDelay = Math.max(2500 - this.stageLevel * 200, 800);
        this.bossFireTimer = this.time.addEvent({
            delay: fireDelay,
            callback: this.fireBossBullet,
            callbackScope: this,
            loop: true
        });
    }

    fireBossBullet() {
        if (!this.boss || !this.boss.active || !this.playerContainer.active) {
            return;
        }
        
        const bulletCount = Math.min(2 + this.stageLevel, 8);
        const spreadAngle = Math.PI / 6;
        const startAngle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.playerContainer.x, this.playerContainer.y) - spreadAngle / 2;
        const angleStep = spreadAngle / (bulletCount - 1);
        const speed = GameConfig.boss.bulletSpeed + this.stageLevel * 15;
        
        const range = this.scale.width / 2;
        const bulletLifespan = (range / speed) * 1000;

        for (let i = 0; i < bulletCount; i++) {
            const angle = startAngle + i * angleStep;
            const bullet = this.enemyBullets.get();
            if (bullet) {
                bullet.setName('enemyBullet');
                bullet.fire(this.boss.x, this.boss.y, angle, 8, 0xff00ff, speed, bulletLifespan);
            }
        }
    }

    hitBoss(bullet, boss) {
        if (!boss.active || !bullet.active) return;
        if (bullet.destroy) bullet.destroy();
        this.score += 50; this.uiScoreText.setText('Score: ' + this.score);
        this.tweens.add({ targets: boss, scale: 1.05, duration: 50, yoyo: true });
        
        const weaponData = WEAPON_DATA[this.playerUpgrades.weaponType];
        boss.health -= (1 + weaponData.bulletSize / 5);
        if (boss.health <= 0) {
            this.createExplosion(boss.x, boss.y, 0xff0000, 100);
            boss.destroy();
            
            if (this.bossFireTimer) {
                this.bossFireTimer.remove();
                this.bossFireTimer = null;
            }
            
            this.createCoin(boss.x, boss.y, GameConfig.boss.coinDrop);
            this.nextStage();
        }
    }
    createCoin(x, y, count = 1) {
        for(let i=0; i < count; i++) {
            const coin = this.add.graphics().fillStyle(0xffd700).fillCircle(0,0,8);
            coin.setPosition(x + Phaser.Math.Between(-20,20), y + Phaser.Math.Between(-20,20));
            this.physics.world.enable(coin);
            coin.body.isCircle = true; coin.body.setVelocity(Phaser.Math.Between(-100,100), Phaser.Math.Between(-150, -50)).setBounce(0.5).setGravityY(300);
            this.coinsGroup.add(coin);
        }
    }
    collectCoin(player, coin) { coin.destroy(); this.coins += this.playerUpgrades.coinValue; this.uiCoinsText.setText('Coins: ' + this.coins); }
    createExplosion(x, y, color, particleCount = 10) {
        for(let i=0; i < particleCount; i++) {
            const p = this.add.graphics().fillStyle(color).fillCircle(0,0,Phaser.Math.Between(2,5));
            p.setPosition(x, y); this.physics.world.enable(p);
            p.body.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(-200, 200));
            this.time.delayedCall(500, () => p.destroy());
        }
    }
}

// =================================================================
// 하이스코어 입력 씬
// =================================================================
class HighScoreEntryScene extends Phaser.Scene {
    constructor() { super({ key: 'HighScoreEntryScene' }); }

    init(data) {
        this.finalScore = data.score;
        this.finalStage = data.stage;
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.setBackgroundColor('#1d2b53');
        
        this.add.text(400, 100, 'HIGH SCORE!', { font: '60px Arial', fill: '#ffff00' }).setOrigin(0.5);
        this.add.text(400, 180, `YOUR SCORE: ${this.finalScore}`, { font: '32px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(400, 250, 'ENTER YOUR NAME (3 CHARS)', { font: '24px Arial', fill: '#ffffff' }).setOrigin(0.5);

        const nameInput = this.add.dom(400, 320).createFromHTML(`
            <input type="text" id="nameField" style="font-size: 32px; width: 100px; text-align: center; text-transform: uppercase;" maxlength="3">
        `);
        const nameField = nameInput.getChildByID('nameField');
        nameField.focus();
        
        const enterButton = this.add.text(400, 400, 'SUBMIT', { font: '32px Arial', fill: '#7fff00', backgroundColor: '#333', padding: { x: 20, y: 10 }})
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const submitScore = () => {
            enterButton.removeListener('pointerdown');
            this.input.keyboard.removeListener('keydown-ENTER');
            
            let playerName = nameField.value.toUpperCase();
            if (playerName.length === 0) {
                playerName = 'AAA';
            }
            
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                ScoreManager.addScore(playerName, this.finalScore);
                this.scene.start('EndScene', { score: this.finalScore, stage: this.finalStage });
            });
        };

        enterButton.on('pointerdown', submitScore);
        this.input.keyboard.on('keydown-ENTER', submitScore);
    }
}


// =================================================================
// 4. 엔딩 화면 (EndScene)
// =================================================================
class EndScene extends Phaser.Scene {
    constructor() { super({ key: 'EndScene' }); }
    init(data) {
        this.finalScore = data.score;
        this.finalStage = data.stage;
    }
    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.setBackgroundColor('#1d2b53');
        
        this.add.text(400, 50, 'GAME OVER', { font: '60px Arial', fill: '#ff4500' }).setOrigin(0.5);
        this.add.text(400, 120, `Your Score: ${this.finalScore}`, { font: '32px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(400, 160, `Reached Stage: ${this.finalStage}`, { font: '32px Arial', fill: '#ffffff' }).setOrigin(0.5);
        
        this.add.text(400, 230, 'HALL OF FAME', { font: '32px Arial', fill: '#ffff00' }).setOrigin(0.5);
        const scores = ScoreManager.loadScores();
        let yPos = 280;
        scores.forEach((scoreEntry, index) => {
            const rank = `${index + 1}.`.padEnd(4);
            const name = scoreEntry.name.padEnd(5);
            const score = scoreEntry.score;
            this.add.text(400, yPos, `${rank}${name}${score}`, { font: '42px "Courier New", Courier, monospace', fill: '#ffffff' }).setOrigin(0.5);
            yPos += 60;
        });

        const restartText = this.add.text(400, 550, 'Click to Restart', { font: '24px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.tweens.add({ targets: restartText, alpha: 0.2, duration: 800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
        
        this.input.once('pointerdown', () => { 
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MainMenuScene'); 
            });
        });
    }
}

// =================================================================
// Phaser 게임 설정 및 실행
// =================================================================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [MainMenuScene, GameScene, ShopScene, HighScoreEntryScene, EndScene]
};

const game = new Phaser.Game(config);