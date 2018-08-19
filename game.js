// code typed out here: https://vimeo.com/105955605
// getting rid of "this" keywords to fix JSLint errors:
// https://stackoverflow.com/questions/30314944/jslint-error-unexpected-this/30375300#30375300
/*global document*/
/*global console*/
/*global window*/
/*global Audio*/
/*global requestAnimationFrame*/
/*jslint
    this
    for
*/
"use strict";
(function () {
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
        var i, x, y;
        for (i = 0; i < 24; i += 1) {
            x = 30 + (i % 8) * 30;
            y = 30 + (i % 3) * 30;
            invaders.push(new Invader(game, {x: x, y: y}));
        }
        return invaders;
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

    var Player = function (game, gameSize) {
        this.game = game;
        this.size = {x: 15, y: 15};
        this.center = {x: gameSize.x / 2, y: gameSize.y - this.size.x};
        this.keyboarder = new Keyboarder();
    };

    Player.prototype = {
        update: function (gameSize) {
            var playPromise;
            var skipLoadNextTime = false;
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
                if (!skipLoadNextTime) {
                    this.game.shootSound.load();
                }
                // https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
                playPromise = this.game.shootSound.play();
                if (playPromise !== undefined) {
                    playPromise.then(function () {
                        // it will not be safe to call load since it would interrupt play() from last call
                        skipLoadNextTime = false;
                    })
                        .catch(function () {
                            skipLoadNextTime = true;
                        });
                }
            }
        }
    };

    var colliding = function (b1, b2) {
        return !(b1 === b2 ||
                b1.center.x + b1.size.x / 2 < b2.center.x - b2.size.x / 2 ||
                b1.center.y + b1.size.y / 2 < b2.center.y - b2.size.y / 2 ||
                b1.center.x - b1.size.x / 2 > b2.center.x + b2.size.x / 2 ||
                b1.center.y - b1.size.y / 2 > b2.center.y + b2.size.y / 2);
    };

    var drawRect = function (screen, body) {
        screen.fillRect(body.center.x - body.size.x / 2,
                body.center.y - body.size.y / 2,
                body.size.x, body.size.y);
    };

    var ongoingTouches = [];

    function colorForTouch(touch) {
        var r = touch.identifier % 16;
        var g = Math.floor(touch.identifier / 3) % 16;
        var b = Math.floor(touch.identifier / 7) % 16;
        r = r.toString(16); // make it a hex digit
        g = g.toString(16); // make it a hex digit
        b = b.toString(16); // make it a hex digit
        var color = "#" + r + g + b;
        console.log("color for touch with identifier " + touch.identifier + " = " + color);
        return color;
    }

    function copyTouch(touch) {
        return {identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY};
    }

    function ongoingTouchIndexById(idToFind) {
        var i, id;
        for (i = 0; i < ongoingTouches.length; i += 1) {
            id = ongoingTouches[i].identifier;
            if (id === idToFind) {
                return i;
            }
        }
        return -1;    // not found
    }

    function handleMove(evt) {
        evt.preventDefault();
        var ctx = this.screen;
        var touches = evt.changedTouches;
        var i, color, idx;

        for (i = 0; i < touches.length; i += 1) {
            color = colorForTouch(touches[i]);
            idx = ongoingTouchIndexById(touches[i].identifier);

            if (idx >= 0) {
                console.log("continuing touch " + idx);
                ctx.beginPath();
                console.log("ctx.moveTo(" + ongoingTouches[idx].pageX + ", " + ongoingTouches[idx].pageY + ");");
                ctx.moveTo(ongoingTouches[idx].pageX, ongoingTouches[idx].pageY);
                console.log("ctx.lineTo(" + touches[i].pageX + ", " + touches[i].pageY + ");");
                ctx.lineTo(touches[i].pageX, touches[i].pageY);
                ctx.lineWidth = 4;
                ctx.strokeStyle = color;
                ctx.stroke();

                ongoingTouches.splice(idx, 1, copyTouch(touches[i]));  // swap in the new touch record
                console.log(".");
            } else {
                console.log("can't figure out which touch to continue");
            }
        }
    }

    function handleStart(evt) {
        evt.preventDefault();
        var ctx = this.screen;
        var touches = evt.changedTouches;
        var i, color;
        console.log("touchstart.");
        for (i = 0; i < touches.length; i += 1) {
            console.log("touchstart:" + i + "...");
            ongoingTouches.push(copyTouch(touches[i]));
            color = colorForTouch(touches[i]);
            ctx.beginPath();
            ctx.arc(touches[i].pageX, touches[i].pageY, 4, 0, 2 * Math.PI, false);  // a circle at the start
            ctx.fillStyle = color;
            ctx.fill();
            console.log("touchstart:" + i + ".");
        }
    }

    function handleEnd(evt) {
        evt.preventDefault();
        console.log("touchend");
        var el = document.getElementsByTagName("canvas")[0];
        var ctx = el.getContext("2d");
        var touches = evt.changedTouches;
        var i, idx, color;

        for (i = 0; i < touches.length; i += 1) {
            color = colorForTouch(touches[i]);
            idx = ongoingTouchIndexById(touches[i].identifier);

            if (idx >= 0) {
                ctx.lineWidth = 4;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(ongoingTouches[idx].pageX, ongoingTouches[idx].pageY);
                ctx.lineTo(touches[i].pageX, touches[i].pageY);
                ctx.fillRect(touches[i].pageX - 4, touches[i].pageY - 4, 8, 8);  // and a square at the end
                ongoingTouches.splice(idx, 1);  // remove it; we're done
            } else {
                console.log("can't figure out which touch to end");
            }
        }
    }

    function handleCancel(evt) {
        evt.preventDefault();
        console.log("touchcancel.");
        var touches = evt.changedTouches;
        var i, idx;

        for (i = 0; i < touches.length; i += 1) {
            idx = ongoingTouchIndexById(touches[i].identifier);
            ongoingTouches.splice(idx, 1);  // remove it; we're done
        }
    }

    var Game = function (canvasId) {
        var canvas = document.getElementById(canvasId);
        this.screen = canvas.getContext('2d');
        //this.screen.addEventListener("touchstart", handleStart, false);
        //this.screen.addEventListener("touchend", handleEnd, false);
        //this.screen.addEventListener("touchcancel", handleCancel, false);
        //this.screen.addEventListener("touchmove", handleMove, false);
        this.screen.fillStyle = "#FFFFFF";
        this.gameSize = {x: canvas.width, y: canvas.height};
        this.bodies = createInvaders(this).concat(new Player(this, this.gameSize));
    };

    Game.prototype = {
        update: function () {
            var bodies = this.bodies;
            var i;
            var notCollingWithAnything = function (b1) {
                return bodies.filter(function (b2) {
                    return colliding(b1, b2);
                }).length === 0;
            };
            this.bodies = this.bodies.filter(notCollingWithAnything);
            for (i = 0; i < this.bodies.length; i += 1) {
                this.bodies[i].update(this.gameSize);
            }
        },
        draw: function () {
            var i;
            this.screen.clearRect(0, 0, this.gameSize.x, this.gameSize.y);
            for (i = 0; i < this.bodies.length; i += 1) {
                drawRect(this.screen, this.bodies[i]);
            }
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

    var loadSound = function (url, callback) {
        var sound = new Audio(url);
        var loaded;
        // http://blog.boyet.com/blog/javascriptlessons/jslint-and-recursive-functions-in-javascript/
        loaded = function () {
            callback(sound);
            sound.removeEventListener('canplaythrough', loaded);
        };
        sound.addEventListener('canplaythrough', loaded);
        sound.load();
    };
    window.onload = function () {
        var myGame = new Game('screen');
        // laser sound from http://www.findsounds.com/ISAPI/search.dll?keywords=laser
        loadSound("https://cdn.glitch.com/d7cd53b1-e67a-4583-a50a-ab66b048c323%2Fshoot.wav?1534647115994", function (theShootSound) {
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