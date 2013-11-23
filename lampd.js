var host = "10.0.12.2",
    username = null,
    light = 2;

var assert = require('assert');

var PowerMate = require('node-powermate'),
    powermate = new PowerMate();

var hue = require('node-hue-api'),
    HueApi = hue.HueApi,
    lightState = hue.lightState,
    api,
    state = lightState.create();

var BRIGHTNESS_MODE = 1, HUE_MODE = 2,
    mode = BRIGHTNESS_MODE,
    brightness = 0, hue = 0,
    lastTouch = 0;

var refreshState = function() {
	if ((new Date()).getTime() - lastTouch < 10000) {
		// not if user touched the knob in the last 10s
		setTimeout(refreshState, 2000);
		return;
	}

	// fetch the current state
	api.lightStatus(light, function(err, result) {
		assert.ifError(err);
		// update stuff we care about
		brightness = (result.state.bri / 255) * 100;
		hue = (result.state.hue / 65535) * 360;
		// refresh again in 5s
		setTimeout(refreshState, 5000);
	});
};

if (username) {
	api = new HueApi(host, username);
	refreshState();
} else {
	api = new HueApi();
	api.createUser(host, null, null, function(err, user) {
		assert.ifError(err);
		console.log("Created user: " + user);
		api = new HueApi(host, user);
		refreshState();
	});
}

var setState = function() {
	if (mode == BRIGHTNESS_MODE)
		setTimeout(setState, 100);
	else if (mode == HUE_MODE)
		setTimeout(setState, 250);

	if (!Object.keys(state).length)
		return;

	api.setLightState(light, state, function(err, lights) {
		assert.ifError(err);
	});

	state = lightState.create();
};
setState();

powermate.on('buttonDown', function() {
	if (mode == BRIGHTNESS_MODE)
		mode = HUE_MODE;
	else if (mode == HUE_MODE)
		mode = BRIGHTNESS_MODE;
});

powermate.on('wheelTurn', function(wheelDelta) {
	lastTouch = (new Date()).getTime();
	if (mode == BRIGHTNESS_MODE) {
		brightness += wheelDelta;
		if (brightness < 0)
			brightness = 0;
		else if (brightness > 100)
			brightness = 100;
		try {
			powermate.setBrightness(brightness * 2.55);
		} catch (e) {} // sometimes throws stupid exception
		if (brightness > 0) {
			state.on = true;
			state.brightness(brightness);
		}
		else {
			state.off();
		}
	} else if (mode == HUE_MODE && brightness > 0) {
		hue += wheelDelta;
		if (hue < 0)
			hue = 0;
		else if (hue > 359)
			hue = 359;
		state.hsl(hue, 100, 0).brightness(brightness);
	}
});
