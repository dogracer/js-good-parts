// code typed out here: https://vimeo.com/105955605
// getting rid of "this" keywords to fix JSLint errors:
// https://stackoverflow.com/questions/30314944/jslint-error-unexpected-this/30375300#30375300
/*global document*/
/*global window*/
/*global Audio*/
/*global requestAnimationFrame*/
"use strict";
(function () {
    var Game = function (canvasId) {
        var canvas = document.getElementById(canvasId);
        var screen = canvas.getContext('2d');
        var gameSize = {x: canvas.width, y: canvas.height};
        var self = this;
        self.bodies = createInvaders(self).concat(new Player(self, gameSize));

        // laser sound from http://www.findsounds.com/ISAPI/search.dll?keywords=laser
        loadSound("shoot.wav", function (shootSound) {
            self.shootSound = shootSound;
            var tick = function () {
                self.update(gameSize);
                self.draw(screen, gameSize);
                requestAnimationFrame(tick);
            };

            tick();
        });
    };

    Game.prototype = {
        update: function (gameSize) {
            var start_bodies = this.bodies;
            var notCollingWithAnything = function (b1) {
                return start_bodies.filter(function (b2) {
                    return colliding(b1, b2);
                }).length === 0;
            };
            var i;
            this.bodies = start_bodies.filter(notCollingWithAnything);
            // this non-for loop doesn't work since addBody() pushes things onto
            // the end of the this.bodies array
            //this.bodies.forEach(function (body) {
            //    body.update(gameSize);
            //});
            // https://stackoverflow.com/questions/30369014/about-jslint-its-dislike-of-for-loops-and-tail-call-optimization
            // another attempt that also doesn't work based on:
            // https://stackoverflow.com/questions/30518554/jslint-unexpected-for
            //Array.prototype.slice.call(this.bodies).every(function (body) {
            //    body.update(gameSize);
            //});
            //var oldLen = this.bodies.length;
            //this.bodies.every(function (body) {
            //    body.update(gameSize);
            //});
            for (i = 0; i < this.bodies.length; i += 1) {
                this.bodies[i].update(gameSize);
            }
        },
        draw: function (screen, gameSize) {
            screen.clearRect(0, 0, gameSize.x, gameSize.y);
            this.bodies.forEach(function (body) {
                drawRect(screen, body);
            });
        },
        addBody: function (body) {
            this.bodies.push(body);
        },
        invadersBelow: function (invader) {
            return this.bodies.filter(function (b) {
                return b instanceof Invader &&
                        b.center.y > invader.center.y &&
                        b.center.x - invader.center.x < invader.size.x;
            }).length > 0;
        }
    };

    var Player = function (game, gameSize) {
        this.game = game;
        this.size = {x: 15, y: 15};
        this.center = {x: gameSize.x / 2, y: gameSize.y - this.size.x};
        this.keyboarder = new Keyboarder();
    };

    Player.prototype = {
        update: function (gameSize) {
            if (this.keyboarder.isDown(this.keyboarder.KEYS.LEFT)) {
                this.center.x -= 2;
                if (this.center.x < 0 + this.size.x / 2) {
                    this.center.x = this.size.x / 2;
                }
            } else if (this.keyboarder.isDown(this.keyboarder.KEYS.RIGHT)) {
                this.center.x += 2;
                if (this.center.x > gameSize.x - this.size.x / 2) {
                    this.center.x = gameSize.x - this.size.x / 2;
                }
            }
            if (this.keyboarder.isDown(this.keyboarder.KEYS.SPACE)) {
                var bullet = new Bullet({x: this.center.x, y: this.center.y - this.size.x / 2}, {x: 0, y: -6});
                this.game.addBody(bullet);
                this.game.shootSound.load();
                this.game.shootSound.play();
            }
        }
    };

    var Invader = function (game, center) {
        this.game = game;
        this.size = {x: 15, y: 15};
        this.center = center;
        this.patrolX = 0;
        this.speedX = 0.3;
    };

    Invader.prototype = {
        update: function () {
            if (this.patrolX < 0 || this.patrolX > 40) {
                this.speedX = -this.speedX;
            }
            this.center.x += this.speedX;
            this.patrolX += this.speedX;

            if (Math.random() > 0.995 && !this.game.invadersBelow(this)) {
                var bullet = new Bullet({x: this.center.x, y: this.center.y + this.size.x / 2}, {x: Math.random() - 0.5, y: 2});
                this.game.addBody(bullet);
            }
        }
    };

    var createInvaders = function (game) {
        var invaders = [];
        (function invaderPos(i) {
            if (i < 24) {
                invaders.push(new Invader(game, {x: 30 + (i % 8) * 30, y: 30 + (i % 3) * 30}));
                invaderPos(i + 1);
            }
        }(0));
        return invaders;
    };

    var Bullet = function (center, velocity) {
        this.size = {x: 3, y: 3};
        this.center = center;
        this.velocity = velocity;
    };

    Bullet.prototype = {
        update: function () {
            this.center.x += this.velocity.x;
            this.center.y += this.velocity.y;
        }
    };

    var drawRect = function (screen, body) {
        screen.fillRect(body.center.x - body.size.x / 2,
                body.center.y - body.size.y / 2,
                body.size.x, body.size.y);
    };

    var Keyboarder = function () {
        var keyState = {};

        //window.onkeyup didn't work so well for me, switched to document
        document.onkeydown = function (e) {
            //console.log(e.type + ' key=' + e.key + ' keycode=' + e.keyCode);
            if (e.keyCode !== undefined) {
                keyState[e.keyCode] = true;
            }
        };

        //window.onkeyup didn't work so well for me, switched to document
        document.onkeyup = function (e) {
            //console.log(e.type + ' key=' + e.key + ' keycode=' + e.keyCode);
            if (e.keyCode !== undefined) {
                keyState[e.keyCode] = false;
            }
        };

        this.isDown = function (keyCode) {
            return keyState[keyCode] === true;
        };

        this.KEYS = {LEFT: 37, RIGHT: 39, SPACE: 32};
    };

    var colliding = function (b1, b2) {
        return !(b1 === b2 ||
                b1.center.x + b1.size.x / 2 < b2.center.x - b2.size.x / 2 ||
                b1.center.y + b1.size.y / 2 < b2.center.y - b2.size.y / 2 ||
                b1.center.x - b1.size.x / 2 > b2.center.x + b2.size.x / 2 ||
                b1.center.y - b1.size.y / 2 > b2.center.y + b2.size.y / 2);
    };

    var loadSound = function (url, callback) {
        var loaded = function () {
            callback(sound);
            sound.removeEventListener('canplaythrough', loaded);
        };
        var sound = new Audio(url);
        sound.addEventListener('canplaythrough', loaded);
        sound.load();
    };
    window.onload = function () {
        return new Game('screen');
    };
}());
