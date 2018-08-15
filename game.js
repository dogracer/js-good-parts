// code typed out here: https://vimeo.com/105955605
// getting rid of "this" keywords to fix JSLint errors:
// https://stackoverflow.com/questions/30314944/jslint-error-unexpected-this/30375300#30375300
/*global document*/
/*global window*/
/*global Audio*/
/*global requestAnimationFrame*/
"use strict";
(function () {
    var game = function (canvasId) {
        var canvas = document.getElementById(canvasId);
        var screen = canvas.getContext('2d');
        var gameSize = {x: canvas.width, y: canvas.height};
        var bullet = function (theCenter, theVelocity) {
            return {
                // changing these into vars so that "this" isn't needed doesn't work
                // to remove those this JSLint errors
                size: {x: 3, y: 3},
                center: theCenter,
                velocity: theVelocity,
                update: function () {
                    this.center.x += this.velocity.x;
                    this.center.y += this.velocity.y;
                }
            };
        };
        var player = function (theGame) {
            var keyState = {};
            var KEYS = {LEFT: 37, RIGHT: 39, SPACE: 32};
            var myGame = theGame;

            //window.onkeyup didn't work so well   for me, switched to document
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

            return {
                size: {x: 15, y: 15},
                center: {x: gameSize.x / 2, y: gameSize.y - 15},
                isDown: function (keyCode) {
                    return keyState[keyCode] === true;
                },
                update: function (gameSize) {
                    if (this.isDown(KEYS.LEFT)) {
                        this.center.x -= 2;
                        if (this.center.x < 0 + this.size.x / 2) {
                            this.center.x = this.size.x / 2;
                        }
                    } else if (this.isDown(KEYS.RIGHT)) {
                        this.center.x += 2;
                        if (this.center.x > gameSize.x - this.size.x / 2) {
                            this.center.x = gameSize.x - this.size.x / 2;
                        }
                    }
                    if (this.isDown(KEYS.SPACE)) {
                        var shootingBullet = bullet({x: this.center.x, y: this.center.y - this.size.x / 2}, {x: 0, y: -6});
                        myGame.addBody(shootingBullet);
                        myGame.shootSound.load();
                        myGame.shootSound.play();
                    }
                }
            };
        };
        var invader = function (theGame, theCenter) {
            var myGame = theGame;

            return {
                patrolX: 0,
                speedX: 0.3,
                size: {x: 15, y: 15},
                center: theCenter,
                update: function () {
                    if (this.patrolX < 0 || this.patrolX > 40) {
                        this.speedX = -this.speedX;
                    }
                    this.center.x += this.speedX;
                    this.patrolX += this.speedX;

                    if (Math.random() > 0.995 && !myGame.invadersBelow(this)) {
                        var enemyBullet = bullet({x: this.center.x, y: this.center.y + this.size.x / 2}, {x: Math.random() - 0.5, y: 2});
                        myGame.addBody(enemyBullet);
                    }
                }
            };
        };
        var createInvaders = function (theGame) {
            var invaders = [];
            var myGame = theGame;

            (function invaderPos(i) {
                if (i < 24) {
                    invaders.push(invader(myGame, {x: 30 + (i % 8) * 30, y: 30 + (i % 3) * 30}));
                    invaderPos(i + 1);
                }
            }(0));
            return invaders;
        };
        var drawRect = function (body) {
            screen.fillRect(body.center.x - body.size.x / 2,
                    body.center.y - body.size.y / 2,
                    body.size.x, body.size.y);
        };
        var colliding = function (b1, b2) {
            return !(b1 === b2 ||
                    b1.center.x + b1.size.x / 2 < b2.center.x - b2.size.x / 2 ||
                    b1.center.y + b1.size.y / 2 < b2.center.y - b2.size.y / 2 ||
                    b1.center.x - b1.size.x / 2 > b2.center.x + b2.size.x / 2 ||
                    b1.center.y - b1.size.y / 2 > b2.center.y + b2.size.y / 2);
        };
        var bodies = {};

        return {
            shootSound: {},
            populate: function () {
                bodies = createInvaders(this).concat(player(this));
            },
            update: function () {
                var start_bodies = bodies;
                var notCollingWithAnything = function (b1) {
                    return start_bodies.filter(function (b2) {
                        return colliding(b1, b2);
                    }).length === 0;
                };
                var i;
                bodies = start_bodies.filter(notCollingWithAnything);
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
                for (i = 0; i < bodies.length; i += 1) {
                    bodies[i].update(gameSize);
                }
            },
            draw: function () {
                screen.clearRect(0, 0, gameSize.x, gameSize.y);
                bodies.forEach(function (body) {
                    drawRect(body);
                });
            },
            addBody: function (body) {
                bodies.push(body);
            },
            invadersBelow: function (thisInvader) {
                return bodies.filter(function (b) {
                    return b.hasOwnProperty('patrolX') &&
                            b.center.y > thisInvader.center.y &&
                            b.center.x - thisInvader.center.x < thisInvader.size.x;
                }).length > 0;
            },
            loadSound: function (url, callback) {
                var sound = new Audio(url);
                function loaded() {
                    callback(sound);
                    sound.removeEventListener('canplaythrough', loaded);
                }
                sound.addEventListener('canplaythrough', loaded);
                sound.load();
            }
        };
    };
    window.onload = function () {
        var myGame = game('screen');
        myGame.populate();
        // laser sound from http://www.findsounds.com/ISAPI/search.dll?keywords=laser
        myGame.loadSound("shoot.wav", function (theShootSound) {
            myGame.shootSound = theShootSound;
            (function tick() {
                myGame.update();
                myGame.draw();
                requestAnimationFrame(tick);
            }());
        });
        return myGame;
    };
}());
