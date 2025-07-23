document.addEventListener('DOMContentLoaded', function() {
    const gameArea = document.getElementById('gameArea');
    const gameWrapper = document.querySelector('.game-wrapper');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    let gameWidth = gameWrapper.offsetWidth;
    let gameHeight = gameWrapper.offsetHeight;

    // Настройки игры
    const settings = {
        ballCount: 3,
        ballSize: 30,
        weaponLength: 40,
        weaponWidth: 5,
        rotationSpeed: 0.05,
        wallBounce: 0.8,
        maxHealth: 100,
        damagePerHit: 10,
        hitCooldown: 1000 // 1 секунда
    };

    // Массив шариков
    const balls = [];
    let lastHitTime = {};

    // Обработчик изменения размера окна
    window.addEventListener('resize', function() {
        if (!document.fullscreenElement) {
            gameWidth = gameWrapper.offsetWidth;
            gameHeight = gameWrapper.offsetHeight;
        }
    });

    // Полноэкранный режим
    fullscreenBtn.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            gameWrapper.requestFullscreen().catch(err => {
                console.error(`Ошибка при переходе в полноэкранный режим: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // Создание шариков
    for (let i = 0; i < settings.ballCount; i++) {
        createBall(i);
        lastHitTime[i] = 0;
    }

    // Создание одного шарика с оружием
    function createBall(index) {
        // Случайная позиция на поле (с отступом от границ)
        const x = Math.random() * (gameWidth - settings.ballSize * 2) + settings.ballSize;
        const y = Math.random() * (gameHeight - settings.ballSize * 2) + settings.ballSize;

        // Создаем элемент шарика
        const ball = document.createElement('div');
        ball.className = 'ball';
        ball.id = `ball${index}`;
        ball.style.width = `${settings.ballSize}px`;
        ball.style.height = `${settings.ballSize}px`;
        ball.style.left = `${x}px`;
        ball.style.top = `${y}px`;
        ball.style.backgroundColor = getRandomColor();

        // Создаем оружие (палочку)
        const weapon = document.createElement('div');
        weapon.className = 'weapon';
        weapon.id = `weapon${index}`;
        weapon.style.width = `${settings.weaponLength}px`;
        weapon.style.height = `${settings.weaponWidth}px`;
        weapon.style.left = `${settings.ballSize/2}px`;
        weapon.style.top = `${settings.ballSize/2 - settings.weaponWidth/2}px`;

        // Создаем индикатор здоровья
        const healthBar = document.createElement('div');
        healthBar.className = 'health-bar';
        healthBar.innerHTML = `
            <div class="health-fill" id="healthFill${index}"></div>
            <div class="health-text" id="healthText${index}">${settings.maxHealth}</div>
        `;

        ball.appendChild(weapon);
        ball.appendChild(healthBar);
        gameArea.appendChild(ball);

        // Сохраняем данные шарика
        balls.push({
            id: index,
            element: ball,
            weapon: weapon,
            x: x,
            y: y,
            speed: 3,
            angle: 0,
            weaponAngle: 0,
            health: settings.maxHealth,
            controls: {
                up: false,
                down: false,
                left: false,
                right: false
            },
            keys: index === 0 ? ['w', 'a', 's', 'd'] :
                index === 1 ? ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'] :
                    ['t', 'f', 'g', 'h'] // Пример для третьего игрока
        });
    }

    // Генерация случайного цвета
    function getRandomColor() {
        const colors = ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Обновление здоровья
    function updateHealth(ball) {
        const healthFill = document.getElementById(`healthFill${ball.id}`);
        const healthText = document.getElementById(`healthText${ball.id}`);

        const healthPercent = (ball.health / settings.maxHealth) * 100;
        healthFill.style.width = `${healthPercent}%`;
        healthText.textContent = ball.health;

        // Изменение цвета в зависимости от здоровья
        if (healthPercent < 30) {
            healthFill.style.backgroundColor = '#f44336';
        } else if (healthPercent < 60) {
            healthFill.style.backgroundColor = '#ff9800';
        } else {
            healthFill.style.backgroundColor = '#4CAF50';
        }
    }

    // Нанесение урона
    function applyDamage(attackerId, victimId) {
        const now = Date.now();
        if (now - lastHitTime[attackerId] < settings.hitCooldown) return;

        lastHitTime[attackerId] = now;
        const victim = balls.find(b => b.id === victimId);

        if (victim && victim.health > 0) {
            victim.health -= settings.damagePerHit;
            if (victim.health < 0) victim.health = 0;

            updateHealth(victim);

            // Эффект при получении урона
            victim.element.style.boxShadow = '0 0 15px red';
            setTimeout(() => {
                victim.element.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
            }, 300);

            // Проверка на смерть
            if (victim.health <= 0) {
                victim.element.style.opacity = '0.5';
                victim.weapon.style.display = 'none';
            }
        }
    }

    // Проверка столкновения с оружием
    function checkWeaponCollision() {
        const now = Date.now();

        for (let i = 0; i < balls.length; i++) {
            const attacker = balls[i];
            if (attacker.health <= 0) continue; // Мёртвые не атакуют

            for (let j = 0; j < balls.length; j++) {
                const victim = balls[j];
                if (i === j || victim.health <= 0) continue; // Не проверяем себя и мёртвых

                // Позиция конца оружия
                const weaponEndX = attacker.x + Math.cos(attacker.weaponAngle) * settings.weaponLength;
                const weaponEndY = attacker.y + Math.sin(attacker.weaponAngle) * settings.weaponLength;

                // Расстояние от центра жертвы до линии оружия
                const distance = pointToLineDistance(
                    victim.x, victim.y,
                    attacker.x, attacker.y,
                    weaponEndX, weaponEndY
                );

                // Если расстояние меньше радиуса шарика - попадание
                if (distance < settings.ballSize / 2) {
                    applyDamage(attacker.id, victim.id);
                }
            }
        }
    }

    // Расстояние от точки до линии
    function pointToLineDistance(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;

        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    // Проверка столкновения со стенами
    function checkWallCollision(ball) {
        const radius = settings.ballSize / 2;

        // Левая стена
        if (ball.x < radius) {
            ball.x = radius;
            return true;
        }
        // Правая стена
        if (ball.x > gameWidth - radius) {
            ball.x = gameWidth - radius;
            return true;
        }
        // Верхняя стена
        if (ball.y < radius) {
            ball.y = radius;
            return true;
        }
        // Нижняя стена
        if (ball.y > gameHeight - radius) {
            ball.y = gameHeight - radius;
            return true;
        }

        return false;
    }

    // Обработка нажатий клавиш
    document.addEventListener('keydown', function(e) {
        balls.forEach(ball => {
            if (e.key.toLowerCase() === ball.keys[0]) ball.controls.up = true;
            if (e.key.toLowerCase() === ball.keys[1]) ball.controls.left = true;
            if (e.key.toLowerCase() === ball.keys[2]) ball.controls.down = true;
            if (e.key.toLowerCase() === ball.keys[3]) ball.controls.right = true;
        });
    });

    document.addEventListener('keyup', function(e) {
        balls.forEach(ball => {
            if (e.key.toLowerCase() === ball.keys[0]) ball.controls.up = false;
            if (e.key.toLowerCase() === ball.keys[1]) ball.controls.left = false;
            if (e.key.toLowerCase() === ball.keys[2]) ball.controls.down = false;
            if (e.key.toLowerCase() === ball.keys[3]) ball.controls.right = false;
        });
    });

    // Игровой цикл
    function gameLoop() {
        balls.forEach(ball => {
            if (ball.health <= 0) return; // Мёртвые не двигаются

            // Сохраняем предыдущие координаты
            const prevX = ball.x;
            const prevY = ball.y;

            // Движение шарика
            if (ball.controls.up) ball.y -= ball.speed;
            if (ball.controls.down) ball.y += ball.speed;
            if (ball.controls.left) ball.x -= ball.speed;
            if (ball.controls.right) ball.x += ball.speed;

            // Проверка столкновения со стенами
            if (checkWallCollision(ball)) {
                ball.x = prevX;
                ball.y = prevY;
            }

            // Обновление позиции шарика
            ball.element.style.left = `${ball.x}px`;
            ball.element.style.top = `${ball.y}px`;

            // Вращение оружия
            ball.weaponAngle += settings.rotationSpeed;
            ball.weapon.style.transform = `rotate(${ball.weaponAngle}rad)`;
        });

        // Проверка столкновений с оружием
        checkWeaponCollision();

        requestAnimationFrame(gameLoop);
    }

    // Запуск игры
    gameLoop();
});