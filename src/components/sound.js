var debug = require('../utils/debug');
var diff = require('../utils').diff;
var registerComponent = require('../core/component').registerComponent;
var THREE = require('../lib/three');

var warn = debug('components:sound:warn');

/**
 * Sound component.
 */
module.exports.Component = registerComponent('sound', {
  schema: {
    src: { default: '' },
    on: { default: 'click' },
    autoplay: { default: false },
    loop: { default: false },
    volume: { default: 1 }
  },

  init: function () {
    this.listener = null;
    this.sound = null;
  },

  update: function (oldData) {
    var data = this.data;
    var diffData = diff(oldData || {}, data);
    var el = this.el;
    var sound = this.sound;
    var src = data.src;
    var srcChanged = 'src' in diffData;

    // Create new sound if not yet created or changing `src`.
    if (srcChanged) {
      if (!src) {
        warn('Audio source was not specified with `src`');
        return;
      }
      sound = this.setupSound();
    }

    if (srcChanged || 'autoplay' in diffData) {
      sound.autoplay = data.autoplay;
    }

    if (srcChanged || 'loop' in diffData) {
      sound.setLoop(data.loop);
    }

    if (srcChanged || 'volume' in diffData) {
      sound.setVolume(data.volume);
    }

    if ('on' in diffData) {
      if (oldData && oldData.on) {
        el.removeEventListener(oldData.on);
      }
      el.addEventListener(data.on, this.play.bind(this));
    }

    // All sound values set. Load in `src.
    if (srcChanged) {
      sound.load(src);
    }
  },

  remove: function () {
    this.el.removeObject3D('sound');
    try {
      this.sound.disconnect();
    } catch (e) {
      // disconnect() will throw if it was never connected initially.
      warn('Audio source not properly disconnected');
    }
  },

  /**
   * Removes current sound object, creates new sound object, adds to entity.
   *
   * @returns {object} sound
   */
  setupSound: function () {
    var el = this.el;
    var sceneEl = el.sceneEl;
    var sound = this.sound;

    if (sound) {
      this.stop();
      el.removeObject3D('sound');
    }

    // Only want one AudioListener. Cache it on the scene.
    var listener = this.listener = sceneEl.audioListener || new THREE.AudioListener();
    sceneEl.audioListener = listener;

    if (sceneEl.camera) {
      sceneEl.camera.add(listener);
    }

    // Wait for camera if necessary.
    sceneEl.addEventListener('camera-set-active', function (evt) {
      evt.detail.cameraEl.getObject3D('camera').add(listener);
    });

    sound = this.sound = new THREE.PositionalAudio(listener);
    el.setObject3D('sound', sound);

    sound.source.onended = function () {
      sound.onEnded();
      el.emit('sound-ended');
    };

    return sound;
  },

  play: function () {
    if (!this.sound.source.buffer) { return; }
    this.sound.play();
  },

  stop: function () {
    if (!this.sound.source.buffer) { return; }
    this.sound.stop();
  },

  pause: function () {
    if (!this.sound.source.buffer || !this.sound.isPlaying) { return; }
    this.sound.pause();
  }
});
