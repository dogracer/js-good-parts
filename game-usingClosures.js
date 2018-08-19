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
                    theCenter.x += theVelocity.x;
                    theCenter.y += theVelocity.y;
                }
            };
        };
        var player = function (theGame) {
            var keyState = {};
            var KEYS = {LEFT: 37, RIGHT: 39, SPACE: 32};
            var myGame = theGame;
            var theCenter = {x: gameSize.x / 2, y: gameSize.y - 15};
            var theSize = {x: 15, y: 15};

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
            function isDown(keyCode) {
                return keyState[keyCode] === true;
            }

            return {
                size: theSize,
                center: theCenter,
                update: function () {
                    if (isDown(KEYS.LEFT)) {
                        theCenter.x -= 2;
                        if (theCenter.x < 0 + theSize.x / 2) {
                            theCenter.x = theSize.x / 2;
                        }
                    } else if (isDown(KEYS.RIGHT)) {
                        theCenter.x += 2;
                        if (theCenter.x > myGame.getGameSize().x - theSize.x / 2) {
                            theCenter.x = myGame.getGameSize().x - theSize.x / 2;
                        }
                    }
                    if (isDown(KEYS.SPACE)) {
                        var shootingBullet = bullet({x: theCenter.x, y: theCenter.y - theSize.x / 2}, {x: 0, y: -6});
                        myGame.addBody(shootingBullet);
                        myGame.shootSound.load();
                        myGame.shootSound.play();
                    }
                }
            };
        };
        var invader = function (theGame, theCenter) {
            var thePatrolX = 0;
            var theSpeedX = 0.3;
            var theSize = {x: 15, y: 15};
            return {
                patrolX: thePatrolX,
                speedX: theSpeedX,
                size: theSize,
                center: theCenter,
                update: function (body) {
                    if (thePatrolX < 0 || thePatrolX > 40) {
                        theSpeedX = -theSpeedX;
                    }
                    theCenter.x += theSpeedX;
                    thePatrolX += theSpeedX;

                    if (Math.random() > 0.995 && !theGame.invadersBelow(body)) {
                        var enemyBullet = bullet({x: theCenter.x, y: theCenter.y + theSize.x / 2}, {x: Math.random() - 0.5, y: 2});
                        theGame.addBody(enemyBullet);
                    }
                }
            };
        };
        var createInvaders = function (theGame) {
            var invaders = [];

            (function invaderPos(i) {
                if (i < 24) {
                    invaders.push(invader(theGame, {x: 30 + (i % 8) * 30, y: 30 + (i % 3) * 30}));
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
        var bodies = [];
        var newlyAddedBodies = [];

        return {
            shootSound: {},
            populate: function (theGame) {
                bodies = createInvaders(theGame).concat(player(theGame));
            },
            getGameSize: function () {
                return gameSize;
            },
            update: function () {
                var start_bodies = bodies;
                var notCollingWithAnything = function (b1) {
                    return start_bodies.filter(function (b2) {
                        return colliding(b1, b2);
                    }).length === 0;
                };
                //var i;
                bodies = start_bodies.filter(notCollingWithAnything);
                bodies.forEach(function (body) {
                    body.update(body);
                });
                if (newlyAddedBodies.length > 0) {
                    newlyAddedBodies.forEach(function (body) {
                        body.update(body);
                    });
                    newlyAddedBodies = [];
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
                newlyAddedBodies.push(body);
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
        // DWG: this populate call seems just plain stupid to me!
        myGame.populate(myGame);
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
